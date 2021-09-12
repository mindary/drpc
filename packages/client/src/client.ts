import 'ts-essentials';
import '@libit/interceptor';

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
import {ClientIncomingHandler, ClientOptions, ClientOutgoingHandler, ClientRequest, WrappedConnect} from './types';
import {MarkRequired} from 'ts-essentials';

const debug = debugFactory('drpc:client');

const DEFAULT_CLIENT_OPTIONS = {
  keepalive: 60,
  protocolId: 'drpc',
  protocolVersion: 1,
  reconnectPeriod: 1000,
  connectTimeout: 30 * 1000,
};

export type ResolvedClientOptions = MarkRequired<ClientOptions, keyof typeof DEFAULT_CLIENT_OPTIONS>;

export interface ClientReservedEvents extends SocketReservedEvents {
  offline: undefined;
  reconnect: undefined;
}

export class Client extends ClientSocket<ClientReservedEvents & SocketReservedEvents> {
  public readonly options: ResolvedClientOptions & ResolvedClientSocketOptions;
  public onincoming?: OnIncoming;
  public oncall?: OnIncoming<'call', Client>;
  public onevent?: OnIncoming<'event', Client>;
  public _reconnectCount: number;

  protected reconnecting: boolean;
  protected reconnectTimer: any;
  protected deferredReconnect: Function | undefined;
  protected incomingInterception = new Interception<Carrier<ActionPacketType>>();
  protected outgoingInterception = new Interception<ClientRequest>();

  readonly #connect: WrappedConnect;

  protected constructor(connect: WrappedConnect, options: ClientOptions) {
    super({
      ...DEFAULT_CLIENT_OPTIONS,
      ...options,
      metadata: options.metadata ? Metadata.from(options.metadata) : new Metadata(),
      onincoming: (carrier, next) => this.handleIncoming(carrier, next),
      onoutgoing: (request, next) => this.handleOutgoing(request, next),
    });
    this.#connect = connect;
    this.onincoming =
      this.options.onincoming ??
      ((carrier, next) =>
        carrier.type === 'call' ? this.oncall?.(carrier as any, next) : this.onevent?.(carrier as any, next));

    this._reconnectCount = 0;
  }

  static async connect(connect: WrappedConnect, options: ClientOptions) {
    return new this(connect, options).connect();
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
    this.clearReconnect();

    if (!this.isConnected()) {
      this.attach(this.#connect(this));
    }
    return this;
  }

  async reconnect() {
    const fn = async () => {
      this.deferredReconnect = undefined;
      await this._reconnect();
    };
    if (this.isClosing()) {
      this.deferredReconnect = fn;
    } else {
      return fn();
    }
  }

  async close() {
    await super.close();
    this.clearReconnect();
    if (this.deferredReconnect) {
      await this.deferredReconnect();
    }
  }

  protected async handleIncoming(carrier: Carrier<ActionPacketType>, next: Next) {
    return this.incomingInterception.invoke(carrier, async () => this.onincoming?.(carrier, next));
  }

  protected async handleOutgoing(request: ClientRequest, next: Next) {
    return this.outgoingInterception.invoke(request, next);
  }

  protected async cleanUp(reason: string | Error) {
    await super.cleanUp(reason);
    if (!this.isClosing()) {
      debug('cleanUp: calling setupReconnect');
      this.clearReconnect();
      this.setupReconnect();
    }
  }

  protected async _reconnect() {
    debug('_reconnect: emitting reconnect to client');
    await this.emit('reconnect');
    if (this.isConnected()) {
      debug('_reconnect: client already connected. disconnecting first.');
      await this.close();
    }
    debug('_reconnect: calling connect');
    await this.connect();
  }

  protected setupReconnect() {
    if (!this.isClosing() && !this.reconnectTimer && this.options.reconnectPeriod > 0) {
      if (!this.reconnecting) {
        debug('setupReconnect: emit `offline` state');
        this.emitReserved('offline').catch(e => this.emitReserved('error', e));
        debug('setupReconnect: set `reconnecting` to `true`');
        this.reconnecting = true;
      }
      debug('setupReconnect: setting reconnectTimer for %d ms', this.options.reconnectPeriod);
      this.reconnectTimer = setInterval(() => {
        debug('reconnectTimer: reconnect triggered!');
        this._reconnect().catch(e => this.emitReserved('error', e));
      }, this.options.reconnectPeriod);
    } else {
      debug('setupReconnect: doing nothing...');
    }
  }

  protected clearReconnect() {
    debug('clearReconnect : clearing reconnect timer');
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
