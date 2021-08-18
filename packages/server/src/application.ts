import debugFactory from 'debug';
import {OnCall, OnServerConnect, OnSignal, Registry, Request, Serializer, Transport} from '@remly/core';
import {Emittery, UnsubscribeFn} from '@libit/emittery';
import {Interception} from '@remly/interception';
import {Connection} from './connection';
import {generateId} from './utils';
import {MsgpackSerializer} from '../../serializer-msgpack';
import {Server} from './server';
import {ServerRequestHandler} from './types';

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

  public onconnect: OnServerConnect;
  public oncall: OnCall;
  public onsignal: OnSignal;

  protected options: ApplicationOptions;
  protected onTransport: (transport: Transport) => void;

  protected connectionsUnsubs: Map<string, UnsubscribeFn[]> = new Map();

  protected connectInterception = new Interception<Request<Connection>>();
  protected requestInterception = new Interception<Request<Connection>>();

  constructor(options: Partial<ApplicationOptions> = {}) {
    super();
    this.options = Object.assign({}, DEFAULT_APPLICATION_OPTIONS, options);
    this.connectTimeout = this.options.connectTimeout;
    this.serializer = this.options.serializer ?? new MsgpackSerializer();
    this.onTransport = transport => this.handle(transport);
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

  addRequestInterceptor(interceptor: ServerRequestHandler) {
    this.requestInterception.add(interceptor);
    return this;
  }

  handle(transport: Transport) {
    new Connection(generateId(), transport, {
      serializer: this.serializer,
      connectTimeout: this.connectTimeout,
      requestTimeout: this.requestTimeout,
      onconnect: request => this.handleConnect(request),
      oncall: request => this.handleCall(request),
      onsignal: request => this.handleCall(request),
    });
  }

  protected async handleConnect(request: Request<Connection>) {
    const {socket} = request;
    debug('adding connection', socket.id);
    try {
      await this.connectInterception.invoke(request);
      await this.doConnect(request);
    } catch (e) {
      await request.error(e);
    }
  }

  protected async handleCall(request: Request<Connection>) {
    try {
      // Both "call" and "signal" will share same interceptors
      await this.requestInterception.invoke(request);

      //
      // The reason we need to handle "call" and "signal" separately is that "call" needs to ensure that the service
      // provides the corresponding method, otherwise will send "Method not found" error.
      //
      // But "signal" does not perform such a check.
      //
      if (request.id) {
        await this.doCall(request);
      } else {
        await this.doSignal(request);
      }
    } catch (e) {
      await request.error(e);
    }
  }

  protected async doConnect(request: Request<Connection>) {
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

  protected async doCall(request: Request<Connection>) {
    if (this.oncall) {
      await this.oncall(request);
    }
    return respond(request);
  }

  protected async doSignal(request: Request<Connection>) {
    if (this.onsignal) {
      await this.onsignal(request);
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

export function respond(request: Request<Connection>) {
  const result = request.result;
  if (!request.ended) {
    return request.end(result);
  }
}
