import debugFactory from 'debug';
import {assert} from 'ts-essentials';
import {Emittery, UnsubscribeFn} from '@libit/emittery';
import {IntervalTimer} from '@libit/timer/interval';
import {TimeoutTimer} from '@libit/timer/timeout';
import {toError} from '@libit/error/utils';
import {JsonSerializer, Serializer} from '@remly/serializer';
import {ValueOrPromise} from '@remly/types';
import {ConnectionStallError, ConnectTimeoutError, InvalidPayloadError, makeRemoteError, RemoteError} from '../errors';
import {RequestRegistry} from '../reqreg';
import {Transport, TransportState} from '../transport';
import {RpcInvoke, SignalHandler} from '../types';
import {Alive} from '../alive';
import {
  AckMessage,
  CallMessage,
  ConnectMessage,
  ErrorMessage,
  HeartbeatMessage,
  OpenMessage,
  PacketMessages,
  SignalMessage,
} from '../messages';
import {Packet} from '../packet';
import {PacketType, PacketTypeKeyType} from '../packet-type';
import {RemoteService, Service} from '../remote-service';

const debug = debugFactory('remly:core:socket');

const DUMMY = Buffer.allocUnsafe(0);

export type SocketState = TransportState | 'connected';

export interface Handshake {
  auth: {[key: string]: any};
}

export type Connect = (handshake: Handshake) => ValueOrPromise<any>;

export interface SocketOptions {
  id?: string;
  serializer: Serializer;
  interval: number;
  keepalive: number;
  connectTimeout: number;
  requestTimeout: number;
  invoke?: RpcInvoke;
  transport?: Transport;
}

interface SocketEvents {
  error: Error;
  open: undefined;
  connect: object;
  connect_error: Error;
  connected: undefined;
  closing: string | Error;
  close: string | Error;
  packet: Packet;
  heartbeat: undefined;
  packet_create: Packet;
  noreq: {type: 'ack' | 'error'; id: number};
}

const DEFAULT_OPTIONS: SocketOptions = {
  serializer: new JsonSerializer(),
  interval: 5 * 1000,
  keepalive: 10 * 1000,
  connectTimeout: 20 * 1000,
  requestTimeout: 10 * 1000,
};

export class SocketEmittery extends Emittery<SocketEvents> {}

export abstract class Socket extends SocketEmittery {
  public id?: string;
  public transport: Transport;
  public state: SocketState;
  public serializer: Serializer;
  public invoke?: RpcInvoke;

  public readonly options: SocketOptions;
  public interval: number;
  public keepalive: number;
  public connectTimeout: number;
  public requestTimeout: number;

  protected unsubs: UnsubscribeFn[] = [];
  protected timer: IntervalTimer | null;
  protected connectTimer: TimeoutTimer;
  protected ee: Emittery = new Emittery();
  protected requests: RequestRegistry = new RequestRegistry();
  protected alive: Alive;

  protected constructor(options: Partial<SocketOptions> = {}) {
    super();

    this.options = Object.assign({}, DEFAULT_OPTIONS, options);
    this.id = this.options.id;
    this.interval = this.options.interval;
    this.keepalive = this.options.keepalive;
    this.connectTimeout = this.options.connectTimeout;
    this.requestTimeout = this.options.requestTimeout;

    this.serializer = options.serializer ?? new JsonSerializer();
    this.invoke = options.invoke;

    if (this.options.transport) {
      this.setTransport(this.options.transport);
    }
  }

  isOpen() {
    return this.state === 'open' || this.state === 'connected';
  }

  isConnected() {
    return this.state === 'connected';
  }

  setTransport(transport: Transport) {
    if (this.transport?.isOpen()) {
      throw new Error('current transport is active. can not re-set transport on a active socket');
    }
    assert(transport, 'Must pass a transport');
    this.transport = transport;

    this.unsubs.push(
      this.transport.on('error', this.doError.bind(this)),
      this.transport.on('close', this.doClose.bind(this)),
      this.transport.on('packet', this.handlePacket.bind(this)),
    );

    this.setup();
    return this;
  }

  async close() {
    if (!this.isOpen()) return;
    await this.closeTransport();
  }

  get lastActive(): number {
    return this.alive.lastActive;
  }

  service<S extends Service>(namespace?: string): RemoteService<S> {
    return new RemoteService<Service>(this, namespace);
  }

  async call(method: string, params?: any, timeout?: number) {
    assert(typeof method === 'string', 'Event must be a string.');
    await this.assertOrWaitConnected();
    const req = this.requests.acquire(timeout ?? this.requestTimeout);
    await this.send('call', {id: req.id, name: method, payload: params});
    return req.promise;
  }

  subscribe(signal: string, handler: SignalHandler): UnsubscribeFn {
    assert(typeof signal === 'string', 'Signal must be a string.');
    assert(typeof handler === 'function', 'Handler must be a function.');
    return this.ee.on(signal, handler);
  }

  async signal(signal: string, data?: any) {
    assert(typeof signal === 'string', 'Event must be a string.');
    await this.assertOrWaitConnected();
    await this.send('signal', {name: signal, payload: data});
  }

  async doError(error: any) {
    debug('transport error =>', error);
    await this.emit('error', error);
    await this.doClose('transport error');
  }

  async handlePacket(packet: Packet) {
    if (!this.isOpen()) {
      return debug('packet received with closed socket');
    }

    this.alive?.touch();

    const {type, message} = packet;
    if (message.payload) {
      try {
        message.payload = this.serializer.deserialize(message.payload);
      } catch (e) {
        debug(`deserialize error for packet ${type}`, e);
        await this.send('connect_error', new InvalidPayloadError(e.message));
        return;
      }
    }

    // export packet event
    debug(`received packet ${type}`);
    await this.emit('packet', packet);

    // Socket is live - any packet counts
    await this.emit('heartbeat');

    switch (type) {
      case PacketType.open:
        await this.handleOpen(message);
        return;
      case PacketType.ping:
        await this.handlePing(message);
        return;
      case PacketType.pong:
        await this.handlePong(message);
        break;
      case PacketType.connect:
        await this.handleConnect(message);
        break;
      case PacketType.connect_error:
        await this.handleConnectError(message);
        break;
      default:
        if (!this.isConnected()) {
          return debug('packet received with not connected socket');
        }
        switch (type) {
          case PacketType.call:
            await this.handleCall(message);
            break;
          case PacketType.ack:
            await this.handleAck(message);
            break;
          case PacketType.error:
            await this.handleError(message);
            break;
          case PacketType.signal:
            await this.handleSignal(message);
            break;
        }
        return;
    }
  }

  async send<T extends PacketTypeKeyType>(type: T, message: PacketMessages[T]) {
    if (this.isOpen()) {
      debug('sending packet "%s" (%j)', type, message);
      const payload = message.payload == null ? DUMMY : message.payload;
      message = {
        ...message,
        payload: this.serializer.serialize(payload),
      };

      const packet = Packet.create(type, message);
      await this.emit('packet_create', packet);
      try {
        await this.transport.send(packet.frame());
      } catch (e) {
        // TODO why no exception throw up and terminate the process
        console.error(e);
      }
    }
  }

  protected async assertOrWaitConnected() {
    if (!this.isConnected()) {
      if (this.isOpen()) {
        await this.once('connected');
      } else {
        throw new Error('connection is not active');
      }
    }
  }

  protected async doClose(reason: string | Error) {
    if (this.state !== 'closed' && this.state !== 'closing') {
      debug('socket close with reason %s', reason);
      this.state = 'closing';
      await this.emit('closing', reason);

      this.unsubs.forEach(fn => fn());
      this.unsubs.splice(0);

      this.connectTimer.cancel();

      await this.clearTransport(reason);

      this.state = 'closed';
      await this.emit('close', reason);
    }
  }

  /**
   * Open packet handler.
   * client should send connect request
   * server should handle as error and close the connection
   * @protected
   */
  protected abstract handleOpen(message: OpenMessage): ValueOrPromise<void>;

  /**
   * Connect packet handler.
   * client should change state to connected
   * server should authenticate the client and send back connect packet for allowed and connect_error for denied.
   * @param message
   * @protected
   */
  protected abstract handleConnect(message: ConnectMessage): ValueOrPromise<void>;

  /**
   * Handle keepalive expired
   * server should send a ping challenge
   * client should ignore it and wait for server ping
   * @param nonce
   * @protected
   */
  protected abstract handleAliveExpired(nonce: Buffer): ValueOrPromise<void>;

  /**
   * Ping packet handler.
   * client should send back heartbeat payload
   * server should handle as error and close the connection
   * @param message
   * @protected
   */
  protected abstract handlePing(message: HeartbeatMessage): ValueOrPromise<void>;

  protected async handlePong(message: HeartbeatMessage) {
    await this.alive.update(message.payload);
  }

  protected async doConnected(id?: string) {
    if (id) this.id = id;
    this.state = 'connected';

    this.connectTimer.cancel();

    this.alive = new Alive(this.keepalive);
    this.unsubs.push(
      this.alive.on('expired', nonce => this.handleAliveExpired(nonce)),
      this.alive.on('error', () => this.handleAliveError()),
    );

    this.startStall();
    await this.emit('connected');
  }

  protected async closeTransport(reason?: string | Error) {
    reason = reason ?? 'forced close';
    await this.transport.close(reason);
    await this.doClose(reason);
  }

  protected async clearTransport(reason?: string | Error) {
    while (this.unsubs.length) {
      this.unsubs.shift()?.();
    }

    // silence further transport errors and prevent uncaught exceptions
    this.transport.on('error', function () {
      debug('error triggered by discarded transport');
    });

    // ensure transport won't stay open
    await this.transport.close(reason);

    await this.stopStall();
  }

  protected startStall() {
    if (!this.timer) {
      debug(`start stall with interval ${this.interval}ms`);
      this.timer = IntervalTimer.start(() => this.maybeStall(), this.interval);
    } else {
      debug('start stall - already start stall');
    }
  }

  protected async stopStall() {
    if (this.timer) {
      debug('stop stall');
      await this.timer.stop();
      this.timer = null;
    } else {
      debug('stop stall - stall has not been started');
    }
  }

  protected async maybeStall() {
    const now = Date.now();
    await this.alive.tick(now);
    this.requests.tick(now);
  }

  protected async handleAliveError() {
    debug('close for heartbeat timeout in', this.alive.timeout);
    await this.emit('connect_error', new ConnectionStallError('Connection is stalling (ping)'));
    await this.close();
  }

  protected setup() {
    this.state = 'open';

    this.connectTimer?.cancel();
    this.connectTimer = new TimeoutTimer(async () => {
      debug('connect timeout, close the client');
      await this.emit('connect_error', new ConnectTimeoutError('Timed out waiting for connection'));
      await this.close();
    }, this.connectTimeout);
  }

  private async handleConnectError(message: ErrorMessage) {
    await this.emit('connect_error', toError(message));
    await this.close();
  }

  private async handleCall(message: CallMessage) {
    if (!this.invoke) {
      throw new Error('"invoke" has not been set');
    }

    const {id, name, payload} = message;

    try {
      const result = await this.invoke(name, payload);
      await this.send('ack', {id, payload: result});
    } catch (e) {
      await this.send('error', {id, ...makeRemoteError(e)});
    }
  }

  private async handleAck(message: AckMessage) {
    const {id, payload} = message;

    if (!this.requests.has(id)) {
      await this.emit('noreq', {type: 'ack', id});
      return;
    }

    this.requests.resolve(id, payload);
  }

  private async handleError(message: ErrorMessage) {
    const {id, code, message: msg, payload} = message;

    if (!this.requests.has(id)) {
      await this.emit('noreq', {type: 'error', id});
      return;
    }

    this.requests.reject(id, new RemoteError(code, msg, payload));
  }

  private async handleSignal(message: SignalMessage) {
    const {name, payload} = message;
    await this.ee.emit(name, payload);
  }
}
