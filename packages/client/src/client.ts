import 'ts-essentials';
import '@libit/interceptor';

import {MarkRequired} from 'ts-essentials';
import Backoff from 'backo2';
import {Next} from '@libit/interceptor';
import {Interception} from '@drpc/interception';
import {
  ActionPacketType,
  Carrier,
  ClientSocket,
  Metadata,
  OnIncoming,
  ResolvedClientSocketOptions,
  SocketReservedEvents,
} from '@drpc/core';
import debugFactory from 'debug';
import {
  ClientCarrier,
  ClientIncomingHandler,
  ClientOptions,
  ClientOutgoingHandler,
  ClientRequest,
  WrappedConnect,
} from './types';

const debug = debugFactory('drpc:client');

const DEFAULT_CLIENT_OPTIONS = {
  keepalive: 60,
  protocolId: 'drpc',
  protocolVersion: 1,
  connectTimeout: 30,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5,
};

export type ResolvedClientOptions = MarkRequired<ClientOptions, keyof typeof DEFAULT_CLIENT_OPTIONS>;

export interface ClientReservedEvents extends SocketReservedEvents {
  offline: undefined;
  reconnect: number;
  reconnect_failed: undefined;
}

export class Client extends ClientSocket<ClientReservedEvents & SocketReservedEvents> {
  public readonly options: ResolvedClientOptions & ResolvedClientSocketOptions;
  public onincoming?: OnIncoming;
  public oncall?: OnIncoming<'call', Client>;
  public onevent?: OnIncoming<'event', Client>;

  protected reconnecting: boolean;
  protected reconnectTimer: any;
  protected deferredReconnect: Function | undefined;
  protected incomingInterception = new Interception<Carrier<ActionPacketType>>();
  protected outgoingInterception = new Interception<ClientRequest>();

  private skipReconnect: boolean;
  private backoff: Backoff;
  private _reconnection: boolean;
  private _reconnectionAttempts: number;
  private _reconnectionDelay: number;
  private _randomizationFactor: number;
  private _reconnectionDelayMax: number;

  readonly #connect: WrappedConnect;

  protected constructor(connect: WrappedConnect, opts: ClientOptions) {
    super({
      ...DEFAULT_CLIENT_OPTIONS,
      ...opts,
      metadata: opts.metadata ? Metadata.from(opts.metadata) : new Metadata(),
    });
    this.reconnection(opts.reconnection !== false);
    this.reconnectionAttempts(opts.reconnectionAttempts || Infinity);
    this.reconnectionDelay(opts.reconnectionDelay || 1000);
    this.reconnectionDelayMax(opts.reconnectionDelayMax || 5000);
    this.randomizationFactor(opts.randomizationFactor ?? 0.5);
    this.backoff = new Backoff({
      min: this.reconnectionDelay(),
      max: this.reconnectionDelayMax(),
      jitter: this.randomizationFactor(),
    });
    this.on('connected', () => this.backoff.reset());

    this.#connect = connect;
    this.onincoming =
      this.options.onincoming ??
      ((carrier, next) =>
        carrier.type === 'call' ? this.oncall?.(carrier as any, next) : this.onevent?.(carrier as any, next));
  }

  static async connect(connect: WrappedConnect, options: ClientOptions) {
    return new this(connect, options).connect();
  }

  /**
   * Sets the `reconnection` config.
   *
   * @param {Boolean} v - true/false if it should automatically reconnect
   * @public
   */
  public reconnection(v: boolean): this;
  public reconnection(): boolean;
  public reconnection(v?: boolean): this | boolean;
  public reconnection(v?: boolean): this | boolean {
    if (!arguments.length) return this._reconnection;
    this._reconnection = !!v;
    return this;
  }

  /**
   * Sets the reconnection attempts config.
   *
   * @param {Number} v - max reconnection attempts before giving up
   * @public
   */
  public reconnectionAttempts(v: number): this;
  public reconnectionAttempts(): number;
  public reconnectionAttempts(v?: number): this | number;
  public reconnectionAttempts(v?: number): this | number {
    if (v === undefined) return this._reconnectionAttempts;
    this._reconnectionAttempts = v;
    return this;
  }

  /**
   * Sets the delay between reconnections.
   *
   * @param {Number} v - delay
   * @public
   */
  public reconnectionDelay(v: number): this;
  public reconnectionDelay(): number;
  public reconnectionDelay(v?: number): this | number;
  public reconnectionDelay(v?: number): this | number {
    if (v === undefined) return this._reconnectionDelay;
    this._reconnectionDelay = v;
    this.backoff?.setMin(v);
    return this;
  }

  /**
   * Sets the randomization factor
   *
   * @param v - the randomization factor
   * @public
   */
  public randomizationFactor(v: number): this;
  public randomizationFactor(): number;
  public randomizationFactor(v?: number): this | number;
  public randomizationFactor(v?: number): this | number {
    if (v === undefined) return this._randomizationFactor;
    this._randomizationFactor = v;
    this.backoff?.setJitter(v);
    return this;
  }

  /**
   * Sets the maximum delay between reconnections.
   *
   * @param v - delay
   * @public
   */
  public reconnectionDelayMax(v: number): this;
  public reconnectionDelayMax(): number;
  public reconnectionDelayMax(v?: number): this | number;
  public reconnectionDelayMax(v?: number): this | number {
    if (v === undefined) return this._reconnectionDelayMax;
    this._reconnectionDelayMax = v;
    this.backoff?.setMax(v);
    return this;
  }

  addIncomingInterceptor(handler: ClientIncomingHandler) {
    this.incomingInterception.add(handler);
    return this;
  }

  addOutgoingInterceptor(handler: ClientOutgoingHandler) {
    this.outgoingInterception.add(handler);
    return this;
  }

  async connect() {
    debug('connect');
    this.clearReconnect();

    if (!this.isConnected()) {
      this.startConnectTiming();
      this.attach(this.#connect(this));
    }
    return this;
  }

  async reconnect() {
    debug('reconnect');
    const fn = async () => {
      this.deferredReconnect = undefined;
      await this.doReconnect();
    };
    if (this.isClosing()) {
      this.deferredReconnect = fn;
    } else {
      return fn();
    }
  }

  async close() {
    debug('close: calling close directly');
    await super.close();
    this.backoff.reset();
    this.reconnecting = false;
    this.clearReconnect();
    if (this.deferredReconnect) {
      this.deferredReconnect();
    }
  }

  protected async doConnected(id?: string) {
    this.reconnecting = false;
    await super.doConnected(id);
  }

  protected async handleIncoming(carrier: ClientCarrier, next: Next) {
    return this.incomingInterception.invoke(carrier, () => super.handleIncoming(carrier, next));
  }

  protected async handleOutgoing(request: ClientRequest, next: Next) {
    return this.outgoingInterception.invoke(request, () => super.handleOutgoing(request, next));
  }

  protected async cleanUp(reason: string | Error) {
    await super.cleanUp(reason);
    if (!this.isClosing()) {
      debug('cleanUp: clearReconnect and setupReconnect');
      this.clearReconnect();
      this.setupReconnect();
    }
  }

  protected async doReconnect() {
    if (this.skipReconnect) return;

    debug('doReconnect: emitting reconnect to client');
    await this.emitReserved('reconnect', this.backoff.attempts);

    if (this.skipReconnect) return;

    if (this.isConnected()) {
      debug('doReconnect: client already connected. disconnecting first.');
      await this.close();
    }
    debug('doReconnect: calling connect');
    await this.connect();
  }

  protected setupReconnect() {
    if (this.isClosing() || this.reconnectTimer || !this._reconnection || this.skipReconnect) {
      debug('setupReconnect: doing nothing...');
      return;
    }

    if (this.reconnecting && this.backoff.attempts >= this._reconnectionAttempts) {
      debug('setupReconnect: reconnect failed');
      this.backoff.reset();
      this.emitReserved('reconnect_failed').catch(this.error);
      this.reconnecting = false;
      return;
    }

    if (!this.reconnecting) {
      debug('setupReconnect: emit `offline` state');
      this.emitReserved('offline').catch(e => this.emitReserved('error', e));
      debug('setupReconnect: set `reconnecting` to `true`');
      this.reconnecting = true;
    }

    const delay = this.backoff.duration();
    debug(`setupReconnect: will wait ${delay}ms before reconnect attempt (${this.backoff.attempts})`);

    this.reconnectTimer = setTimeout(() => {
      debug(`reconnectTimer: reconnect triggered! (${this.backoff.attempts})`);
      this.doReconnect().catch(this.error);
    }, delay);
  }

  protected clearReconnect() {
    debug('clearReconnect: clearing reconnect timer');
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
