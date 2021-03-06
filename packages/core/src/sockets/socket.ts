import debugFactory from 'debug';
import {assert} from 'ts-essentials';
import {DatalessEventNames, Emittery, UnsubscribeFn} from '@libit/emittery';
import {IntervalTimer} from '@libit/timer/interval';
import {TimeoutTimer} from '@libit/timer/timeout';
import {toError} from '@libit/error/utils';
import {ServiceMethods, ValueOrPromise} from '@drpc/types';
import {
  AckMessageType,
  ErrorMessageType,
  EventMessageType,
  MessageTypes,
  Metadata,
  packer,
  Packet,
  PacketType,
} from '@drpc/packet';
import {ConnectionStallError, ConnectTimeoutError, RemoteError, UnimplementedError} from '../errors';
import {Transport, TransportState} from '../transport';
import {ActionPacketType, CallOptions, NetAddress, OnAuth, OnIncoming, OnOutgoing} from '../types';
import {Alive} from '../alive';
import {Request, RequestPacketType} from '../request';
import {createResponse} from '../response';
import {Carrier} from '../carrier';
import {Store} from '../store';
import {RemoteService} from '../remote';
import {Next} from '@libit/interceptor';

const debug = debugFactory('drpc:core:socket');

export type SocketState = 'connecting' | 'connected' | TransportState;

export interface SocketReservedEvents {
  // Both "emitReserved" and "emit" may emit "error" event
  error: Error;
  tick: undefined;
  connect: undefined;
  connected: undefined;
  closing: string | Error;
  close: string | Error;
  packet: Packet;
  packet_create: Packet;
  heartbeat: undefined;
}

export const SOCKET_RESERVED_EVENTS: ReadonlySet<string> = new Set<keyof SocketReservedEvents>(<const>[
  // IMPORTANT: ignore "error" event
  'tick',
  'connect',
  'connected',
  'closing',
  'close',
  'packet',
  'packet_create',
  'heartbeat',
]);

export type SocketReservedDatalessEvents = DatalessEventNames<SocketReservedEvents>;

export type SocketEvents = SocketReservedEvents & {
  [name: string]: any;
};

export interface SocketOptions {
  id?: string;
  interval?: number;
  keepalive?: number;
  connectTimeout?: number;
  requestTimeout?: number;
  transport?: Transport;
  onauth?: OnAuth;
  onincoming?: OnIncoming;
  onoutgoing?: OnOutgoing;
}

const DEFAULT_OPTIONS: SocketOptions = {
  interval: 5,
  keepalive: 60,
  connectTimeout: 30,
  requestTimeout: 10,
};

export abstract class Socket<
  EventData extends SocketReservedEvents = SocketReservedEvents,
  DatalessEvents = DatalessEventNames<EventData>,
> extends Emittery<SocketEvents> {
  readonly options: SocketOptions;

  public tag: string;
  public id?: string;
  public transport: Transport;
  public state: SocketState;
  public interval: number;
  public keepalive: number;
  public connectTimeout: number;
  public requestTimeout: number;
  public error: (error: Error) => void;
  public onauth?: OnAuth;
  public onincoming?: OnIncoming;
  public onoutgoing: OnOutgoing;
  protected store: Store = new Store();
  protected subs: UnsubscribeFn[] = [];
  protected timer: IntervalTimer | null;
  protected connectTimer: TimeoutTimer;
  protected alive: Alive;
  // for RPC onAny
  protected ee: Emittery = new Emittery();

  protected constructor(options: SocketOptions = {}) {
    super();
    this.tag = this.constructor.name;

    this.options = Object.assign({}, DEFAULT_OPTIONS, options);
    this.id = this.options.id;
    this.interval = this.options.interval!;
    this.keepalive = this.options.keepalive!;
    this.connectTimeout = this.options.connectTimeout!;
    this.requestTimeout = this.options.requestTimeout!;
    this.error = err => this.emitReserved('error', err);

    this.onauth = options.onauth;
    this.onincoming = options.onincoming;
    this.onoutgoing = options.onoutgoing ?? ((request, next) => next());

    // this.remote = new Remote(this, {onoutgoing: options.onoutgoing});

    if (this.options.transport) {
      this.attach(this.options.transport);
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
    return this.state !== 'closing' && this.state !== 'closed';
  }

  isConnecting() {
    return this.state === 'connecting';
  }

  isConnected() {
    return this.state === 'connected';
  }

  isClosing() {
    return this.state === 'closing';
  }

  attach(transport: Transport) {
    if (this.transport?.isOpen()) {
      throw new Error('current transport is active. can not re-set transport on a active socket');
    }
    assert(transport, 'Must pass a transport');
    this.transport = transport;

    this.subs.push(
      this.transport.on('error', this.doError.bind(this)),
      this.transport.on('close', this.doClose.bind(this)),
      this.transport.on('packet', this.handlePacket.bind(this)),
    );
    // this.setup();
    this.transport
      .ready()
      .then(() => this.open())
      .catch(e => this.emitReserved('error', e));
    return this;
  }

  async close() {
    debug(`${this.tag}.close: calling close directly`);
    this.state = 'closing';
    const reason = 'forced close';
    await this.emitReserved('closing', reason);
    await this.closeTransport(reason);
  }

  onAny(listener: (eventName: string, eventData?: any) => any | Promise<any>): UnsubscribeFn {
    return this.ee.onAny(listener as any);
  }

  /**
   * Send event to remote socket
   *
   */
  async emit(eventName: string | symbol, metadata?: Metadata): Promise<void>;
  async emit(eventName: string | symbol, eventData?: any, metadata?: Metadata): Promise<void>;
  async emit(eventName: string | symbol, eventData?: any, metadata?: Metadata): Promise<void> {
    if (typeof eventName === 'symbol') {
      return super.emit(eventName as any);
    }

    if (SOCKET_RESERVED_EVENTS.has(eventName)) {
      throw new Error(`"${eventName}" event is reserved`);
    }

    if (Metadata.isMetadata(eventData)) {
      metadata = eventData;
      eventData = undefined;
    }

    const request = new Request<'event'>(this, 'event', {
      message: {name: eventName, payload: eventData},
      metadata,
    });

    await this.ready();
    await this.handleOutgoing(request, async () => {
      await this.send('event', {name: request.message.name, payload: request.message.payload}, request.metadata);
    });
  }

  /**
   * Emit reserved events on local socket
   *
   * @param eventName
   */
  async emitReserved<Name extends SocketReservedDatalessEvents>(eventName: Name): Promise<void>;
  async emitReserved<Name extends DatalessEvents>(eventName: Name): Promise<void>;
  async emitReserved<Name extends keyof EventData>(eventName: Name, eventData: EventData[Name]): Promise<void>;
  async emitReserved<Name extends keyof EventData>(eventName: Name, eventData?: EventData[Name]): Promise<void> {
    if (eventName !== 'error' || super.listenerCount(eventName)) {
      return super.emit(eventName as string, eventData);
    } else {
      console.error(`[${this.tag}]`, `Missing "${eventName}" handler on "socket".`);
      console.error(eventData);
    }
  }

  /**
   * Emit rpc events on local socket
   *
   * @param event
   */
  async emitEvent(event: EventMessageType): Promise<void> {
    const {name, payload} = event;
    // emit for specific event listeners
    await super.emit(name, payload);
    // emit for any listeners
    await this.ee.emit(name, payload);
  }

  service<T extends ServiceMethods>(namespace?: string): RemoteService<T> {
    return new RemoteService(this, namespace);
  }

  /**
   * Call remote method
   *
   */
  async call(method: string, args?: any, options?: CallOptions): Promise<any>;
  async call(method: string, args?: any, metadata?: Metadata, options?: CallOptions): Promise<any>;
  async call(method: string, args?: any, metadata?: Metadata | CallOptions, options?: CallOptions): Promise<any> {
    if (metadata && !Metadata.isMetadata(metadata)) {
      options = metadata;
      metadata = undefined;
    }
    await this.ready();
    const r = this.store.acquire(options?.timeout ?? this.requestTimeout);
    const request = new Request(this, 'call', {
      message: {id: r.id, name: method, payload: args},
      metadata,
    });

    return this.handleOutgoing(request, async () => {
      await this.send(
        'call',
        {
          id: r.id,
          name: request.message.name,
          payload: request.message.payload,
        },
        request.metadata,
      );
      return r.promise;
    });
  }

  async send<T extends PacketType>(type: T, message: MessageTypes[T], metadata?: Metadata) {
    await this.transport.ready();
    if (debug.enabled) {
      debug('send: sending packet "%s"', type, message);
    }
    const packet: Packet<T> = {type, message, metadata};
    await this.emitReserved('packet_create', packet);
    try {
      await this.transport.send(packer.pack(packet));
    } catch (e) {
      // TODO why no exception throw up and terminate the process
      console.error(e);
    }
  }

  /**
   * Connect packet handler.
   * client deny it
   * server should authenticate the client and send back connack packet for allowed and error for denied.
   * @param packet
   * @protected
   */
  protected abstract handleConnect(packet: Packet<'connect'>): ValueOrPromise<void>;

  /**
   * Auth packet handler.
   * client handle according to stage
   * server handle according to stage
   * @param packet
   * @protected
   */
  protected abstract handleAuth(packet: Packet<'auth'>): ValueOrPromise<any>;

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

  protected abstract doDisconnect(): Promise<void>;

  protected open() {
    if (!this.state || this.state === 'closed') {
      debug('open');
      this.state = 'open';

      this.startConnectTiming();
    }
  }

  protected startConnectTiming() {
    debug(`${this.tag}.startConnectTiming`);
    this.connectTimer?.cancel();
    this.connectTimer = new TimeoutTimer(() => this.handleConnectTimout(), this.connectTimeout * 1000);
  }

  protected async handleConnectTimout() {
    debug(`${this.tag}.handleConnectTimout: connect timeout, close the client`);
    await this.emitReserved('error', new ConnectTimeoutError('Timed out waiting for connecting'));
    await this.doDisconnect();
  }

  protected async handleAliveError() {
    debug(`${this.tag}.handleAliveError: close for heartbeat timeout in ${this.alive.timeout}ms`);
    await this.emitReserved('error', new ConnectionStallError('Connection is stalling (ping)'));
    await this.doDisconnect();
  }

  protected async handlePacket(packet: Packet) {
    const {type, message} = packet;

    // export packet event
    if (debug.enabled) {
      debug(`${this.tag}.handlePacket: received packet "${type ?? 'unknown'}"`);
    }

    await this.emitReserved('packet', packet);

    if (type === 'connect') {
      if (this.isConnecting() || this.isConnected()) {
        await this.close();
        return;
      }
      await this.handleConnect(packet as any);
      return;
    }

    if (!this.isConnecting() && !this.isConnected()) {
      await this.close();
      return;
    }

    this.alive?.touch();
    try {
      // Socket is live - any packet counts
      await this.emitReserved('heartbeat');

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
        case 'connack':
          await this.handleConnack(packet as any);
          break;
        case 'auth':
          await this.handleAuth(packet as any);
          break;
        default:
          if (!this.isConnected()) {
            return debug('handlePacket: packet received with not connected socket');
          }

          switch (type) {
            case 'call':
            case 'event':
              await this.handleRequest(packet as any);
              break;
            // call response
            case 'ack':
            case 'error':
              // notify to handle call responses
              await this.handleResponse(packet as any);
              break;
          }

          return;
      }
    } catch (e: any) {
      await this.emitReserved('error', e);
    }
  }

  protected async doError(error: any) {
    debug('doError: transport error =>', error);
    await this.emitReserved('error', error);
    await this.doClose('transport error');
  }

  protected async doClose(reason: string | Error) {
    if (this.state !== 'closed') {
      debug(`${this.tag}.doClose: close socket with reason %s`, reason);
      await this.cleanUp(reason);

      debug(`${this.tag}.doClose: change state from '${this.state}' to 'closed'`);
      this.state = 'closed';

      // notify ee disconnected
      await this.emitReserved('close', reason);
    }
  }

  protected async cleanUp(reason: string | Error) {
    debug(`${this.tag}.cleanUp`);
    this.connectTimer.cancel();

    while (this.subs.length) {
      this.subs.shift()?.();
    }

    // ensure transport won't stay open
    if (this.transport.isOpen()) {
      // silence further transport errors and prevent uncaught exceptions
      this.transport.on('error', function () {
        debug('doClose: error triggered by discarded transport');
      });
      await this.transport.close(reason);
    }

    await this.stopStall();
  }

  protected async handlePong({message}: Packet<'pong'>) {
    await this.alive.update(message.payload);
  }

  protected async doConnected(id?: string) {
    if (id) this.id = id;
    this.state = 'connected';

    this.connectTimer.cancel();

    this.alive = new Alive(this.keepalive * 1000);
    this.subs.push(
      this.alive.on('expired', nonce => this.handleAliveExpired(nonce)),
      this.alive.on('error', () => this.handleAliveError()),
    );

    this.startStall();
    await this.emitReserved('connect');
    await this.emitReserved('connected');
  }

  protected async closeTransport(reason: string | Error) {
    await this.transport.close(reason);
    await this.doClose(reason);
  }

  protected startStall() {
    if (!this.timer) {
      debug(`startStall: with interval ${this.interval}s`);
      this.timer = IntervalTimer.start(() => this.maybeStall(), this.interval * 1000);
    } else {
      debug('startStall: already start stall');
    }
  }

  protected async stopStall() {
    if (this.timer) {
      debug(`${this.tag}.stopStall`);
      this.timer.stop().catch(e => this.emitReserved('error', e));
      debug(`${this.tag}.stopStall: set timer to null`);
      this.timer = null;
    } else {
      debug(`${this.tag}.stopStall: stall has not been started`);
    }
  }

  protected async maybeStall() {
    this.alive.tick(Date.now()).catch(this.error);
    this.store.check();
    this.emitReserved('tick').catch(this.error);
  }

  protected createCarrier<T extends RequestPacketType>({type, message, metadata}: Packet<T>): Carrier<T> {
    const request = new Request<T>(this, type, {
      message,
      metadata,
    });
    const id = (message as any)?.id;
    const response = createResponse(type, this, id);
    request.response = response;
    response.request = request;

    return new Carrier(request, response);
  }

  protected async handleConnectError({message}: Packet<'error'>) {
    await this.emitReserved('error', toError(message.message));
    await this.close();
  }

  protected async handleRequest(packet: Packet<'event' | 'call'>): Promise<void> {
    const {type} = packet;
    // id of 0,null,undefined means event
    const carrier = this.createCarrier(packet);

    try {
      const result = await this.handleIncoming(carrier, () => {
        throw new UnimplementedError();
      });
      if (type === 'call') {
        // call
        await carrier.res.endIfNotEnded('ack', {payload: result});
        return;
      }
      // event
      return await this.emitEvent(packet.message);
    } catch (e: any) {
      if (!carrier.ended && e?.message) {
        await carrier.error(e);
      } else {
        console.error(e);
      }
    }
  }

  protected async handleResponse(packet: Packet<'ack' | 'error'>) {
    switch (packet.type) {
      case 'ack':
        await this.handleAck((packet as Packet<'ack'>).message);
        break;
      case 'error':
        await this.handleError((packet as Packet<'error'>).message);
        break;
    }
  }

  protected async handleAck(message: AckMessageType) {
    const {id, payload} = message;

    if (!this.store.has(id)) {
      // emit back noreq event
      await this.emit('noreq', {type: 'ack', id});
      return;
    }

    this.store.resolve(id, payload);
  }

  protected async handleError(message: ErrorMessageType) {
    const {id, code, message: msg} = message;

    if (!this.store.has(id)) {
      // emit back noreq event
      await this.emit('noreq', {type: 'error', id});
      return;
    }

    this.store.reject(id, new RemoteError(code, msg));
  }

  protected async handleIncoming(carrier: Carrier<ActionPacketType>, next: Next) {
    if (carrier.type === 'call' && !this.onincoming) {
      throw new UnimplementedError();
    }
    return this.onincoming?.(carrier, next);
  }

  protected async handleOutgoing(request: Request<ActionPacketType>, next: Next) {
    if (!this.onoutgoing) {
      return next();
    }

    return this.onoutgoing(request, next);
  }
}
