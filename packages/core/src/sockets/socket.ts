import debugFactory from 'debug';
import {assert} from 'ts-essentials';
import {Emittery, UnsubscribeFn} from '@libit/emittery';
import {IntervalTimer} from '@libit/timer/interval';
import {TimeoutTimer} from '@libit/timer/timeout';
import {toError} from '@libit/error/utils';
import {ValueOrPromise} from '@drpc/types';
import {ErrorMessageType, MessageTypes, Metadata, packer, Packet, PacketType} from '@drpc/packet';
import {ConnectionStallError, ConnectTimeoutError, UnimplementedError} from '../errors';
import {Transport, TransportState} from '../transport';
import {NetAddress, OnIncoming, OnOutgoing} from '../types';
import {Alive} from '../alive';
import {Remote} from '../remote';
import {Request, RequestPacketType} from '../request';
import {Response} from '../response';
import {Carrier} from '../carrier';

const debug = debugFactory('drpc:core:socket');

export type SocketState = TransportState | 'connected';

export interface SocketEvents {
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
  response: Packet;
}

export interface SocketOptions {
  id?: string;
  interval?: number;
  keepalive?: number;
  connectTimeout?: number;
  requestTimeout?: number;
  transport?: Transport;
  onincoming?: OnIncoming;
  onoutgoing?: OnOutgoing;
}

const DEFAULT_OPTIONS: SocketOptions = {
  interval: 5,
  keepalive: 10,
  connectTimeout: 20,
  requestTimeout: 10,
};

export class SocketEmittery extends Emittery<SocketEvents> {}

export abstract class Socket extends SocketEmittery {
  public id?: string;
  public transport: Transport;
  public state: SocketState;
  public onincoming?: OnIncoming;
  public interval: number;
  public keepalive: number;
  public connectTimeout: number;
  public requestTimeout: number;
  public metadata: Metadata;

  public readonly options: SocketOptions;
  public readonly remote: Remote;

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

    this.onincoming = options.onincoming;

    this.remote = new Remote(this, {onoutgoing: options.onoutgoing});

    if (this.options.transport) {
      this.setTransport(this.options.transport);
    }
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
    // this.setup();
    this.transport
      .ready()
      .then(() => this.setup())
      .catch(e => this.emit('error', e));
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

    // export packet event
    if (debug.enabled) {
      debug(`received packet "${type ?? 'unknown'}"`);
    }
    try {
      await this.emit('packet', packet);

      // Socket is live - any packet counts
      await this.emit('heartbeat');

      // handle connect error first
      // id of 0 or null or undefined means connect error
      if (type === 'error' && !(message as ErrorMessageType).id) {
        await this.handleConnectError(packet as any);
        return;
      }

      switch (type) {
        case 'ping':
          await this.handlePing(packet as any);
          break;
        case 'pong':
          await this.handlePong(packet as any);
          break;
        case 'connect':
          await this.handleConnect(packet as any);
          break;
        case 'connack':
          await this.handleConnack(packet as any);
          break;
        default:
          if (!this.isConnected()) {
            return debug('packet received with not connected socket');
          }

          switch (type) {
            case 'call':
            case 'signal':
              await this.handleRequest(packet as any);
              break;
            // call response
            case 'ack':
            case 'error':
              // notify to handle call responses
              await this.emit('response', packet);
              break;
          }

          return;
      }
    } catch (e: any) {
      await this.emit('error', e);
    }
  }

  async send<T extends PacketType>(type: T, message: MessageTypes[T], metadata?: Metadata) {
    await this.transport.ready();
    debug('sending packet "%s"', type, message);
    const packet: Packet<T> = {type, message, metadata};
    await this.emit('packet_create', packet);
    try {
      await this.transport.send(packer.pack(packet));
    } catch (e) {
      // TODO why no exception throw up and terminate the process
      console.error(e);
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
      // notify ee disconnected
      await this.emit('close', reason);
    }
  }

  /**
   * Connect packet handler.
   * client deny it
   * server should authenticate the client and send back connack packet for allowed and connect_error for denied.
   * @param packet
   * @protected
   */
  protected abstract handleConnect(packet: Packet<'connect'>): ValueOrPromise<void>;

  /**
   * Connack packet handler.
   * client change state to connected
   * server deny it
   * @param packet
   * @protected
   */
  protected abstract handleConnack(packet: Packet<'connack'>): ValueOrPromise<void>;

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
   * @param packet
   * @protected
   */
  protected abstract handlePing(packet: Packet<'ping'>): ValueOrPromise<void>;

  protected async handlePong({message}: Packet<'pong'>) {
    await this.alive.update(message.payload);
  }

  protected async doConnected(id?: string) {
    if (id) this.id = id;
    this.state = 'connected';

    this.connectTimer.cancel();

    this.alive = new Alive(this.keepalive * 1000);
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
      debug(`start stall with interval ${this.interval}s`);
      this.timer = IntervalTimer.start(() => this.maybeStall(), this.interval * 1000);
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
    debug(`close for heartbeat timeout in ${this.alive.timeout}ms`);
    await this.emit('connect_error', new ConnectionStallError('Connection is stalling (ping)'));
    await this.close();
  }

  protected setup() {
    debug('setup');
    this.state = 'open';

    this.connectTimer?.cancel();
    this.connectTimer = new TimeoutTimer(async () => {
      debug('connect timeout, close the client');
      await this.emit('connect_error', new ConnectTimeoutError('Timed out waiting for connecting'));
      await this.close();
    }, this.connectTimeout * 1000);
  }

  protected createCarrier<T extends RequestPacketType>({type, message, metadata}: Packet<T>) {
    const request = new Request(this, type, {
      message,
      metadata,
    });
    const response = new Response(this, type, (message as any)?.id);
    request.response = response;
    response.request = request;

    return new Carrier(request, response);
  }

  private async handleConnectError({message}: Packet<'error'>) {
    await this.emit('connect_error', toError(message.message));
    await this.close();
  }

  private async handleRequest(packet: Packet<'signal' | 'call'>) {
    const {type} = packet;
    // id of 0,null,undefined means signal
    const carrier = this.createCarrier(packet);

    try {
      const result = await this.onincoming?.(carrier, () => {
        if (carrier.isCall()) {
          throw new UnimplementedError();
        }
        // signal will ignore returns
        return true;
      });
      if (type === 'call') {
        // call
        if (!carrier.ended) {
          await carrier.end(result);
        }
      } else {
        // signal
        await this.remote.emit(packet.message);
      }
    } catch (e: any) {
      if (!carrier.ended && e?.message) {
        await carrier.error(e);
      } else {
        console.error(e);
      }
    }
  }
}
