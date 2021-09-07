import debugFactory from 'debug';
import {CallablePacketType, Carrier, OnIncoming, Registry, Transport, ValueOrPromise} from '@drpc/core';
import {Emittery, UnsubscribeFn} from '@libit/emittery';
import {Next} from '@libit/interceptor';
import {Interception} from '@drpc/interception';
import {Connection} from './connection';
import {ConnectHandler, ServerCarrier, ServerIncomingHandler, ServerOutgoingHandler, ServerRequest} from './types';

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
  public readonly handle: (transport: Transport) => void;

  public onconnect?: OnConnect;
  public onincoming?: OnIncoming;
  public oncall?: OnIncoming;
  public onsignal?: OnIncoming;

  protected options: ApplicationOptions;

  protected connectionsUnsubs: Map<string, UnsubscribeFn[]> = new Map();

  protected connectInterception = new Interception<Carrier<'connect', Connection>>();
  protected incomingInterception = new Interception<Carrier<CallablePacketType, Connection>>();
  protected outgoingInterception = new Interception<ServerRequest<CallablePacketType>>();

  constructor(options: Partial<ApplicationOptions> = {}) {
    super();
    this.options = Object.assign({}, DEFAULT_APPLICATION_OPTIONS, options);
    this.connectTimeout = this.options.connectTimeout;

    this.handle = transport =>
      new Connection(transport, {
        connectTimeout: this.connectTimeout,
        requestTimeout: this.requestTimeout,
        onconnect: carrier => this.handleConnect(carrier),
        onincoming: (carrier, next) => this.handleIncoming(carrier, next),
        onoutgoing: (request, next) => this.handleOutgoing(request, next),
      });

    this.onincoming = (carrier, next) =>
      carrier.isCall() ? this.oncall?.(carrier, next) : this.onsignal?.(carrier, next);
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

  addConnectInterceptor(interceptor: ConnectHandler) {
    this.connectInterception.add(interceptor);
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

  protected async handleConnect(carrier: ServerCarrier<'connect'>) {
    const {socket} = carrier;
    debug('adding connection', socket.id);
    await this.connectInterception.invoke(carrier, () => this.doConnect(carrier));
  }

  protected async handleIncoming(carrier: ServerCarrier<CallablePacketType>, next: Next) {
    return this.incomingInterception.invoke(carrier, () => this.doIncoming(carrier, next));
  }

  protected async handleOutgoing(request: ServerRequest<CallablePacketType>, next: Next) {
    return this.outgoingInterception.invoke(request, next);
  }

  protected async doConnect(carrier: ServerCarrier<'connect'>) {
    const {socket} = carrier;

    if (!socket.isOpen()) {
      return debug('socket has been closed - cancel connect');
    }

    if (this.onconnect) {
      await this.onconnect(carrier);
    }

    await this.registerConnection(socket);
  }

  protected async doIncoming(carrier: ServerCarrier<CallablePacketType>, next: Next) {
    if (this.onincoming) {
      return this.onincoming(carrier, next);
    }
    return next();
  }

  protected async registerConnection(conn: Connection) {
    if (this.connections.has(conn.id)) {
      await this.connections.get(conn.id)!.close();
    }

    this._add(conn);
  }

  protected _add(conn: Connection) {
    this.connections.set(conn.id, conn);
    this.connectionsUnsubs.set(conn.id, [
      conn.on('connected', () => this._connected(conn)),
      conn.on('close', () => this._remove(conn)),
    ]);
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

  protected async _connected(connection: Connection) {
    await this.emit('connection', connection);
  }
}
