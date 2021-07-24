import {Connection, ConnectionOptions, DefaultRegistry, Handler, RegisterOptions, Registry} from '@remly/core';
import {ConnectionError} from './errors';
import {UnsubscribeFn} from 'emittery';
import Emittery = require('emittery');

export interface ServerDataEvents<T> {
  error: Error;
  connect: T;
  connection: T;
  disconnect: T;
  connectionClose: T;
}

export interface ServerOptions {
  registry?: Registry;
  connection?: Partial<ConnectionOptions>;
}

export abstract class Server<
  T extends Connection,
  DataEvents extends ServerDataEvents<T> = ServerDataEvents<T>,
> extends Emittery<DataEvents & ServerDataEvents<T>> {
  protected options: ServerOptions;

  protected constructor(options?: ServerOptions) {
    super();
    this.options = options = options ?? {};
    this._registry = options.registry;
  }

  protected _connections?: Record<string, T>;

  get connections(): Record<string, T> {
    if (!this._connections) this._connections = {};
    return this._connections;
  }

  protected _registry?: Registry;

  get registry(): Registry {
    if (!this._registry) this._registry = new DefaultRegistry();
    return this._registry;
  }

  set registry(registry: Registry | undefined) {
    this._registry = registry;
  }

  async error(err: Error) {
    await this.emit('error', err);
  }

  register<S extends object>(service: S, opts?: RegisterOptions): void;
  register<S extends object, K extends keyof S>(service: S, names: (K | string)[], opts?: RegisterOptions): void;
  register(name: string, handler: Handler, opts?: RegisterOptions): void;
  register<S extends object>(
    nameOrService: string | S,
    handler?: Handler | string[] | RegisterOptions,
    opts?: RegisterOptions,
  ) {
    return this.registry.register(<any>nameOrService, <any>handler, <any>opts);
  }

  unregister(pattern: string | string[]): string[] {
    return this.registry.unregister(pattern);
  }

  protected abstract createConnection<O extends ConnectionOptions>(options?: O): T;

  protected buildConnectionOptions(options?: Partial<ConnectionOptions>): ConnectionOptions {
    return {
      registry: this.registry,
      ...this.options.connection,
      ...options,
    };
  }

  protected async createAndRegisterConnection<O>(options?: O): Promise<T> {
    return this.registerConnection(this.createConnection(this.buildConnectionOptions(options)));
  }

  protected async registerConnection(connection: T) {
    if (this.connections[connection.id]) {
      return connection;
    }

    await this._bindConnection(connection);

    this.connections[connection.id] = connection;

    await this.emit('connection', connection);
    await this.emit('connect', connection);

    return connection;
  }

  protected async unregisterConnection(connection: T) {
    if (!this.connections[connection.id]) {
      return connection;
    }

    delete this.connections[connection.id];

    this._unbindConnection(connection);

    await this.emit('connectionClose', connection);
    await this.emit('disconnect', connection);

    return connection;
  }

  private async _bindConnection(connection: T) {
    if ((connection as any).__remly_unsubs__) {
      return;
    }

    const unsubs: UnsubscribeFn[] = [];

    unsubs.push(
      connection.on('error', async (err: Error) => {
        await this.error(new ConnectionError(connection, err));
      }),
    );

    unsubs.push(
      connection.on('close', async () => {
        await this.unregisterConnection(connection);
      }),
    );

    (connection as any).__remly_unsubs__ = unsubs;
  }

  private _unbindConnection(connection: T) {
    if (!(connection as any).__remly_unsubs__) {
      return;
    }

    (connection as any).__remly_unsubs__.forEach((unsub: UnsubscribeFn) => unsub());
    delete (connection as any).__remly_unbind__;
  }
}
