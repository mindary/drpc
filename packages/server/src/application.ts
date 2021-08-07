import debugFactory from 'debug';
import {Registry, RegistryMixin, RpcInvoke, Serializer, Transport} from '@remly/core';
import {Emittery, UnsubscribeFn} from '@libit/emittery';
import {GenericInterceptorChain} from '@libit/interceptor';
import {Connection} from './connection';
import {ConnectHandler} from './types';
import {generateId} from './utils';
import {MsgpackSerializer} from '../../serializer-msgpack';
import {Server} from './server';

const debug = debugFactory('remly:server:app');

export interface ApplicationEvents {
  error: Error;
  connect: Connection;
  connection: Connection;
  disconnect: Connection;
  connectionClose: Connection;
}

export interface ApplicationOptions {
  registry?: Registry;
  serializer?: Serializer;
  invoke?: RpcInvoke;
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

export class Application extends RegistryMixin(ApplicationEmittery) {
  public readonly serializer: Serializer;
  public readonly connections: Map<string, Connection> = new Map();

  protected options: ApplicationOptions;
  protected middlewares: ConnectHandler[] = [];
  protected connectionsUnsubs: Map<string, UnsubscribeFn[]> = new Map();

  protected onTransport: (transport: Transport) => void;

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

  use(fn: ConnectHandler): this {
    this.middlewares.push(fn);
    return this;
  }

  handle(transport: Transport) {
    const connection: Connection = new Connection(generateId(), transport, {
      serializer: this.serializer,
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
    const chain = new GenericInterceptorChain(connection, this.middlewares);
    return chain.invokeInterceptors();
  }
}
