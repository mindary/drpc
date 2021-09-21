import debugFactory from 'debug';
import {ActionPacketType, Carrier, OnIncoming, Transport, TransportOptions, ValueOrPromise} from '@drpc/core';
import {Emittery, UnsubscribeFn} from '@libit/emittery';
import {Interception} from '@drpc/interception';
import {Registry} from '@drpc/registry';
import {Connection} from './connection';
import {
  AuthHandler,
  ServerCarrier,
  ServerIncomingHandler,
  ServerOutgoingHandler,
  ServerRequest,
  TransportHandler,
} from './types';
import {accept} from './transports';
import {Next} from '@libit/interceptor';

const debug = debugFactory('drpc:application');

export type OnConnect = (carrier: Carrier<'connect', Connection>) => ValueOrPromise<any>;

export interface ApplicationEvents {
  error: Error;
  connection: Connection;
  disconnect: Connection;
  connectionClose: Connection;
}

export interface ApplicationOptions {
  registry?: Registry;
  connectTimeout?: number;
  requestTimeout?: number;

  [p: string]: any;
}

export const DEFAULT_APPLICATION_OPTIONS = {
  connectTimeout: 45000,
  requestTimeout: 10000,
};

export class ApplicationEmittery extends Emittery<ApplicationEvents> {
  //
}

export class Application extends ApplicationEmittery {
  public readonly connections: Map<string, Connection> = new Map();
  public readonly handle: TransportHandler;

  public onconnect?: OnConnect;
  public onincoming?: OnIncoming;
  public oncall?: OnIncoming;
  public onevent?: OnIncoming;

  protected options: ApplicationOptions;

  protected connectionsUnsubs: Map<string, UnsubscribeFn[]> = new Map();

  protected authInterception = new Interception<Carrier<'auth', Connection>>();
  protected incomingInterception = new Interception<Carrier<ActionPacketType, Connection>>();
  protected outgoingInterception = new Interception<ServerRequest<ActionPacketType>>();

  constructor(options: Partial<ApplicationOptions> = {}) {
    super();
    this.options = Object.assign({}, DEFAULT_APPLICATION_OPTIONS, options);
    this.connectTimeout = this.options.connectTimeout;

    this.handle = socket => this.doHandle(socket);
    this.onincoming = (carrier, next) =>
      carrier.type === 'call' ? this.oncall?.(carrier, next) : this.onevent?.(carrier, next);
  }

  private _connectTimeout: number;

  get connectTimeout(): number {
    return this._connectTimeout;
  }

  set connectTimeout(timeout: number | undefined) {
    this._connectTimeout = timeout ? timeout : DEFAULT_APPLICATION_OPTIONS.connectTimeout;
  }

  private _requestTimeout: number;

  get requestTimeout() {
    return this._requestTimeout;
  }

  set requestTimeout(timeout: number | undefined) {
    this._requestTimeout = timeout ? timeout : DEFAULT_APPLICATION_OPTIONS.requestTimeout;
  }

  addAuthInterceptor(interceptor: AuthHandler) {
    this.authInterception.add(interceptor);
    return this;
  }

  addIncomingInterceptor(interceptor: ServerIncomingHandler) {
    this.incomingInterception.add(interceptor);
    return this;
  }

  addOutgoingInterceptor(interceptor: ServerOutgoingHandler) {
    this.outgoingInterception.add(interceptor);
    return this;
  }

  accept(options?: TransportOptions) {
    return (socket: any) => {
      this.handle(accept(socket, options));
    };
  }

  protected doHandle(transport: Transport) {
    const conn = new Connection(transport, {
      connectTimeout: this.connectTimeout,
      requestTimeout: this.requestTimeout,
      onconnect: carrier => this.handleConnect(carrier),
      onauth: carrier => this.handleAuth(carrier),
      onincoming: (carrier, next) => this.handleIncoming(carrier, next),
      onoutgoing: (request, next) => this.handleOutgoing(request, next),
    });
    conn
      .once('connected')
      .then(() => this.registerConnection(conn))
      .catch(e => this.emit('error', e));
    return conn;
  }

  protected async handleConnect(carrier: Carrier<'connect', Connection>) {
    await this.onconnect?.(carrier);
  }

  protected async handleAuth(carrier: Carrier<'auth', Connection>) {
    // intercept authentication, throw error for un-auth
    return this.authInterception.invoke(carrier);
  }

  protected async handleIncoming(carrier: ServerCarrier<ActionPacketType>, next: Next) {
    // call doIncoming to handle call or event request if incomingInterception not handled
    return this.incomingInterception.invoke(carrier, () => this.doIncoming(carrier, next));
  }

  protected async handleOutgoing(request: ServerRequest<ActionPacketType>, next: Next) {
    // next will do send the request
    return this.outgoingInterception.invoke(request, next);
  }

  protected async doIncoming(carrier: ServerCarrier<ActionPacketType>, next: Next) {
    return this.onincoming?.(carrier, next);
  }

  protected async registerConnection(conn: Connection) {
    if (this.connections.has(conn.id)) {
      await this.connections.get(conn.id)!.close();
    }

    this._add(conn);
    await this.emit('connection', conn);
  }

  protected _add(conn: Connection) {
    this.connections.set(conn.id, conn);
    this.connectionsUnsubs.set(conn.id, [conn.on('close', () => this._remove(conn))]);
  }

  protected async _remove(connection: Connection) {
    if (this.connections.has(connection.id)) {
      this.connections.delete(connection.id);

      this.connectionsUnsubs.get(connection.id)?.forEach(fn => fn());
      this.connectionsUnsubs.delete(connection.id);

      await this.emit('disconnect', connection);
      await this.emit('connectionClose', connection);
    } else {
      debug('ignoring remove for connection %s', connection.id);
    }
  }
}
