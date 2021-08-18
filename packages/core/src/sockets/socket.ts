import debugFactory from 'debug';
import {assert} from 'ts-essentials';
import {Emittery, UnsubscribeFn} from '@libit/emittery';
import {IntervalTimer} from '@libit/timer/interval';
import {TimeoutTimer} from '@libit/timer/timeout';
import {toError} from '@libit/error/utils';
import {Serializer} from '@remly/serializer';
import {ValueOrPromise} from '@remly/types';
import {MsgpackSerializer} from '@remly/serializer-msgpack';
import {ConnectionStallError, ConnectTimeoutError, InvalidPayloadError, makeRemoteError, RemoteError} from '../errors';
import {Transport, TransportState} from '../transport';
import {RequestInfo, Metadata, NetAddress} from '../types';
import {Alive} from '../alive';
import {
  CallMessage,
  ConnectMessage,
  ErrorMessage,
  HeartbeatMessage,
  OpenMessage,
  PacketMessages,
  SignalMessage,
} from '../messages';
import {Packet} from '../packet';
import {PacketType, PacketTypeKeyType, PacketTypeMap} from '../packet-types';
import {Remote} from '../remote';
import {Request} from '../request';

const debug = debugFactory('remly:core:socket');

const DUMMY = Buffer.allocUnsafe(0);

export type SocketState = TransportState | 'connected';

export type OnCall<SOCKET extends Socket = any> = (request: Request<SOCKET>) => ValueOrPromise<void>;
export type OnSignal<SOCKET extends Socket = any> = (request: Request<SOCKET>) => ValueOrPromise<void>;

interface SocketEvents {
  tick: undefined;
  error: Error;
  open: Socket;
  connect: object;
  connect_error: Error;
  connected: undefined;
  closing: string | Error;
  close: string | Error;
  packet: Packet;
  packet_create: Packet;
  heartbeat: undefined;
  reply: Packet;
}

export interface SocketOptions {
  id?: string;
  serializer?: Serializer;
  interval?: number;
  keepalive?: number;
  connectTimeout?: number;
  requestTimeout?: number;
  transport?: Transport;
  oncall?: OnCall;
  onsignal?: OnSignal;
}

const DEFAULT_OPTIONS: SocketOptions = {
  interval: 5 * 1000,
  keepalive: 10 * 1000,
  connectTimeout: 20 * 1000,
  requestTimeout: 10 * 1000,
};

export interface Handshake {
  sid: string;
  metadata: Metadata;
}

export class SocketEmittery extends Emittery<SocketEvents> {}

export abstract class Socket extends SocketEmittery {
  public id?: string;
  public transport: Transport;
  public state: SocketState;
  public serializer: Serializer;
  public oncall?: OnCall;
  public onsignal?: OnSignal;
  public readonly remote: Remote;
  public readonly handshake: Handshake;

  public readonly options: SocketOptions;
  public interval: number;
  public keepalive: number;
  public connectTimeout: number;
  public requestTimeout: number;

  protected unsubs: UnsubscribeFn[] = [];
  protected timer: IntervalTimer | null;
  protected connectTimer: TimeoutTimer;
  protected alive: Alive;

  protected constructor(options: SocketOptions = {}) {
    super();

    this.options = Object.assign({}, DEFAULT_OPTIONS, options);
    this.id = this.options.id;
    this.interval = this.options.interval!;
    this.keepalive = this.options.keepalive!;
    this.connectTimeout = this.options.connectTimeout!;
    this.requestTimeout = this.options.requestTimeout!;

    this.serializer = options.serializer ?? new MsgpackSerializer();
    this.oncall = options.oncall;
    this.onsignal = options.onsignal;

    this.remote = new Remote(this);

    this.handshake = {sid: '', metadata: {}};

    if (this.options.transport) {
      this.setTransport(this.options.transport);
    }
  }

  get metadata(): Metadata {
    return this.handshake.metadata;
  }

  set metadata(metadata: Metadata | undefined) {
    this.handshake.metadata = metadata ?? {};
  }

  get address(): NetAddress {
    return this.transport?.address;
  }

  get lastActive(): number {
    return this.alive.lastActive;
  }

  /**
   * Return a promise for connected state.
   *
   * __NOTE__: Visit it again to recheck the connection status. You need to recheck the returned promise instance,
   * it expires when it has been resolved or rejected.
   *
   * - resolve if state is 'connected' or changed from 'open' to 'connected'.
   * - reject if state is 'closing' or 'closed'
   */
  ready(): Promise<void> {
    if (this.isConnected()) {
      return Promise.resolve();
    }
    if (this.state === 'closing' || this.state === 'closed') {
      throw new Error('socket is closing or closed');
    }
    return this.once('connected');
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
        if (debug.enabled) {
          debug(`deserialize error for packet "${PacketTypeMap[type] ?? 'unknown'}"`, e);
        }
        await this.sendError(new InvalidPayloadError(e.message));
        return;
      }
    }

    // export packet event
    if (debug.enabled) {
      debug(`received packet "${PacketTypeMap[type] ?? 'unknown'}"`);
    }
    try {
      await this.emit('packet', packet);

      // Socket is live - any packet counts
      await this.emit('heartbeat');

      // handle connect error first
      // id of 0 or null or undefined means connect error
      if (type === PacketType.error && !message.id) {
        await this.handleConnectError(message);
        return;
      }

      switch (type) {
        case PacketType.open:
          await this.handleOpen(message);
          break;
        case PacketType.ping:
          await this.handlePing(message);
          break;
        case PacketType.pong:
          await this.handlePong(message);
          break;
        case PacketType.connect:
          await this.handleConnect(message);
          break;

        default:
          if (!this.isConnected()) {
            return debug('packet received with not connected socket');
          }

          switch (type) {
            case PacketType.call:
            case PacketType.signal:
              await this.handleCall(message);
              break;
            // call response
            case PacketType.ack:
            case PacketType.error:
              // notify to handle call responses
              await this.emit('reply', packet);
              break;
          }

          return;
      }
    } catch (e) {
      await this.emit('error', e);
    }
  }

  async send<T extends PacketTypeKeyType>(type: T, message: PacketMessages[T]) {
    if (this.isOpen()) {
      debug('sending packet "%s"', type, message);
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

  async sendError(error: RemoteError): Promise<void>;
  async sendError(id: number, error: RemoteError): Promise<void>;
  async sendError(id: number | RemoteError, error?: RemoteError) {
    if (typeof id !== 'number') {
      error = id;
      id = 0;
    }
    await this.send('error', {id, ...makeRemoteError(error)});
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
      // notify ee disconnected
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
    await this.alive.tick(Date.now());
    await this.emit('tick');
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

  protected createRequest(message: RequestInfo) {
    return new Request<this>(this, message);
  }

  protected async doCall(request: Request<this>) {
    await this.oncall?.(request);
  }

  protected async doSignal(request: Request<this>) {
    await this.onsignal?.(request);
  }

  private async handleConnectError(message: ErrorMessage) {
    await this.emit('connect_error', toError(message));
    await this.close();
  }

  private async handleCall(message: CallMessage | SignalMessage) {
    // id of 0,null,undefined means signal
    const id = (message as CallMessage).id;
    const request = this.createRequest({id, name: message.name, args: message.payload});
    try {
      if (id) {
        // call
        await this.doCall(request);
        if (!request.ended) {
          await request.end(request.result);
        }
      } else {
        // signal
        await this.doSignal(request);
        await this.remote.handleSignal(request);
      }
    } catch (e) {
      if (request.ended) {
        throw e;
      }
      await request.error(e);
    }
  }
}
