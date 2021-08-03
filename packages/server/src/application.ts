import debugFactory from 'debug';
import {JsonSerializer, Registry, RegistryMixin, RpcInvoke, Serializer, Transport} from '@remly/core';
import {Emittery, UnsubscribeFn} from '@libit/emittery';
import {GenericInterceptorChain} from '@libit/interceptor';
import {Connection} from './connection';
import {MiddlewareInterceptor} from './types';
import {generateId} from './utils';

const debug = debugFactory('remly:server:app');

export interface ServerDataEvents {
  error: Error;
  connect: Connection;
  connection: Connection;
  disconnect: Connection;
  connectionClose: Connection;
}

export interface ServerOptions {
  registry?: Registry;
  serializer?: Serializer;
  invoke?: RpcInvoke;
  connectTimeout: number;
  requestTimeout: number;
}

export const DEFAULT_APP_OPTIONS: ServerOptions = {
  connectTimeout: 45000,
  requestTimeout: 10000,
};

export class ApplicationEmittery extends Emittery<ServerDataEvents> {
  //
}

export class Application extends RegistryMixin(ApplicationEmittery) {
  public readonly serializer: Serializer;
  public readonly connections: Map<string, Connection> = new Map();

  protected options: ServerOptions;
  protected middlewares: MiddlewareInterceptor[] = [];
  protected connectionsUnsubs: Map<string, UnsubscribeFn[]> = new Map();

  constructor(options: Partial<ServerOptions> = {}) {
    super();
    this.options = Object.assign({}, DEFAULT_APP_OPTIONS, options);
    this.connectTimeout = this.options.connectTimeout;
    this.serializer = this.options.serializer ?? new JsonSerializer();
  }

  private _connectTimeout: number;

  get connectTimeout(): number {
    return this._connectTimeout;
  }

  set connectTimeout(timeout: number | undefined) {
    this._connectTimeout = timeout ? timeout : DEFAULT_APP_OPTIONS.connectTimeout;
  }

  private _requestTimeout: number;

  get requestTimeout() {
    return this._requestTimeout;
  }

  set requestTimeout(timeout: number | undefined) {
    this._requestTimeout = timeout ? timeout : DEFAULT_APP_OPTIONS.requestTimeout;
  }

  use(fn: MiddlewareInterceptor): this {
    this.middlewares.push(fn);
    return this;
  }

  handle(transport: Transport) {
    const connection: Connection = new Connection(generateId(), transport, {
      connectTimeout: this.connectTimeout,
      requestTimeout: this.requestTimeout,
      invoke: this.invoke,
      connect: () => this.doConnect(connection),
    });
  }

  protected async doConnect(connection: Connection) {
    debug('adding connection', connection.id);

    await this.invokeMiddlewares(connection);

    if (connection.state !== 'open') {
      return debug('next called after connection was closed - ignoring socket');
    }

    this.connections.set(connection.id, connection);
    this.connectionsUnsubs.set(connection.id, [
      connection.on('connected', () => this.doConnected(connection)),
      connection.on('close', () => this.doRemove(connection)),
    ]);
  }

  protected async doConnected(connection: Connection) {
    await this.emit('connect', connection);
    await this.emit('connection', connection);
  }

  protected async doRemove(connection: Connection) {
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

  protected async invokeMiddlewares(connection: Connection) {
    const chain = new GenericInterceptorChain({connection}, this.middlewares);
    return chain.invokeInterceptors();
  }
}
