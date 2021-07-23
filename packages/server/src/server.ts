import {Connection, ConnectionOptions, DefaultRegistry, Handler, RegisterOptions, Registry} from '@remly/core';
import {ConnectionError} from './errors';
import {UnsubscribeFn} from 'emittery';
import Emittery = require('emittery');

export interface ServerDataEvents<T> {
  error: Error;
  connection: T;
  connectionClose: T;
}

export interface ServerOptions {
  registry?: Registry;
  connection?: ConnectionOptions;
}

export abstract class Server<
  T extends Connection,
  DataEvents extends ServerDataEvents<T> = ServerDataEvents<T>,
> extends Emittery<DataEvents & ServerDataEvents<T>> {
  protected options: ServerOptions;
  protected registry: Registry;

  protected constructor(options?: ServerOptions) {
    super();
    this.options = options = options ?? {};
    this.registry = options.registry ?? new DefaultRegistry();
  }

  protected _connections: Record<string, T> = {};

  get connections(): Record<string, T> {
    return this._connections;
  }

  error(err: Error) {
    // eslint-disable-next-line no-void
    void this.emit('error', err);
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

  protected buildConnectionOptions(options?: ConnectionOptions): ConnectionOptions {
    return {
      ...this.options.connection,
      ...options,
      registry: this.registry,
    };
  }

  protected createAndRegisterConnection<O>(options?: O) {
    return this.registerConnection(this.createConnection(this.buildConnectionOptions(options)));
  }

  protected registerConnection(connection: T) {
    if (this._connections[connection.id]) {
      return connection;
    }

    this._bindConnection(connection);

    this._connections[connection.id] = connection;
    // eslint-disable-next-line no-void
    void this.emit('connection', connection);

    return connection;
  }

  protected unregisterConnection(connection: T) {
    if (!this._connections[connection.id]) {
      return connection;
    }

    delete this._connections[connection.id];

    this._unbindConnection(connection);

    // eslint-disable-next-line no-void
    void this.emit('connectionClose', connection);
    return connection;
  }

  private _bindConnection(connection: T) {
    if ((connection as any).__remly_unsubs__) {
      return;
    }

    const unsubs: UnsubscribeFn[] = [];

    unsubs.push(
      connection.on('error', (err: Error) => {
        this.error(new ConnectionError(connection, err));
      }),
    );

    unsubs.push(
      connection.on('close', () => {
        this.unregisterConnection(connection);
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
