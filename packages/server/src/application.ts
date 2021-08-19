import debugFactory from 'debug';
import {OnRequest, OnServerConnect, Registry, Serializer, Transport} from '@remly/core';
import {Emittery, UnsubscribeFn} from '@libit/emittery';
import {Next} from '@libit/interceptor';
import {Interception} from '@remly/interception';
import {Connection} from './connection';
import {generateId} from './utils';
import {MsgpackSerializer} from '../../serializer-msgpack';
import {Server} from './server';
import {ServerDispatchHandler, ServerRequest, ServerRequestHandler} from './types';

const debug = debugFactory('remly:server:application');

export interface ApplicationEvents {
  error: Error;
  connection: Connection;
  disconnect: Connection;
  connectionClose: Connection;
}

export interface ApplicationOptions {
  registry?: Registry;
  serializer?: Serializer;
  connectTimeout?: number;
  requestTimeout?: number;
}

export const DEFAULT_APPLICATION_OPTIONS = {
  connectTimeout: 45000,
  requestTimeout: 10000,
};

export class ApplicationEmittery extends Emittery<ApplicationEvents> {
  //
}

export class Application extends ApplicationEmittery {
  public readonly serializer: Serializer;
  public readonly connections: Map<string, Connection> = new Map();

  public onconnect?: OnServerConnect;
  public onrequest?: OnRequest;
  public oncall?: OnRequest;
  public onsignal?: OnRequest;

  protected options: ApplicationOptions;
  protected onTransport: (transport: Transport) => void;

  protected connectionsUnsubs: Map<string, UnsubscribeFn[]> = new Map();

  protected connectInterception = new Interception<ServerRequest>();
  protected incomingInterception = new Interception<ServerRequest>();
  protected outgoingInterception = new Interception<ServerRequest>();

  constructor(options: Partial<ApplicationOptions> = {}) {
    super();
    this.options = Object.assign({}, DEFAULT_APPLICATION_OPTIONS, options);
    this.connectTimeout = this.options.connectTimeout;
    this.serializer = this.options.serializer ?? new MsgpackSerializer();
    this.onTransport = transport => this.handle(transport);

    this.onrequest = request => (request.isCall() ? this.oncall?.(request) : this.onsignal?.(request));
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

  bind(server: Server<any, any>) {
    server.on('transport', this.onTransport);
    return this;
  }

  unbind(server: Server<any, any>) {
    server.off('transport', this.onTransport);
    return this;
  }

  addConnectInterceptor(interceptor: ServerRequestHandler) {
    this.connectInterception.add(interceptor);
    return this;
  }

  addIncomingInterceptor(interceptor: ServerRequestHandler) {
    this.incomingInterception.add(interceptor);
    return this;
  }

  addOutgoingInterceptor(interceptor: ServerDispatchHandler) {
    this.outgoingInterception.add(interceptor);
    return this;
  }

  handle(transport: Transport) {
    new Connection(generateId(), transport, {
      serializer: this.serializer,
      connectTimeout: this.connectTimeout,
      requestTimeout: this.requestTimeout,
      dispatch: (request, next) => this.handleOutgoing(request, next),
      onconnect: request => this.handleConnect(request),
      onrequest: request => this.handleIncoming(request),
    });
  }

  protected async handleConnect(request: ServerRequest) {
    const {socket} = request;
    debug('adding connection', socket.id);
    try {
      await this.connectInterception.invoke(request, () => this.doConnect(request));
    } catch (e) {
      await request.error(e);
    }
  }

  protected async handleIncoming(request: ServerRequest) {
    try {
      return this.incomingInterception.invoke(request, () => this.doRequest(request));
    } catch (e) {
      await request.error(e);
    }
  }

  protected async handleOutgoing(request: ServerRequest, next: Next) {
    return this.outgoingInterception.invoke(request, next);
  }

  protected async doConnect(request: ServerRequest) {
    const {socket} = request;

    if (!socket.isOpen()) {
      return debug('socket has been closed - cancel connect');
    }

    if (this.onconnect) {
      await this.onconnect(request);
    }

    this.connections.set(socket.id, socket);
    this.connectionsUnsubs.set(socket.id, [
      socket.on('connected', () => this._connected(socket)),
      socket.on('close', () => this._remove(socket)),
    ]);
  }

  protected async doRequest(request: ServerRequest) {
    if (this.onrequest) {
      return this.onrequest(request);
    }
  }

  protected async _connected(connection: Connection) {
    await this.emit('connection', connection);
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
