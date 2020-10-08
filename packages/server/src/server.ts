import {Connection, ConnectionOptions, EventName, Handler, RegisterOptions, Registry} from '@remly/core';
import Emittery = require('emittery');

export interface ServerDataEvents<T> {
  connection: T;
  connectionClose: T;
}

export type ServerEmptyEvents = EventName;

export interface ServerOptions {
  registry?: Registry;
  connection?: ConnectionOptions;
}

export abstract class Server<
  T extends Connection,
  DataEvents extends ServerDataEvents<T> = ServerDataEvents<T>,
  EmptyEvents extends ServerEmptyEvents = ServerEmptyEvents
> extends Emittery.Typed<DataEvents & ServerDataEvents<T>, EmptyEvents | ServerEmptyEvents> {
  protected options: ServerOptions;
  protected registry: Registry;

  protected connections: Record<string, T> = {};

  protected constructor(options?: ServerOptions) {
    super();
    this.options = options = options ?? {};
    this.registry = options.registry ?? new Registry();
  }

  protected abstract createConnection<O extends ConnectionOptions>(options?: O): T;

  protected buildConnectionOptions(options?: ConnectionOptions): ConnectionOptions {
    return {
      ...this.options.connection,
      ...options,
      registry: this.registry,
    };
  }

  protected bindConnection(connection: T) {
    connection.on('close', () => {
      this.unregisterConnection(connection);
    });

    this.registerConnection(connection);

    return connection;
  }

  protected createAndBindConnection<O>(options?: O) {
    return this.bindConnection(this.createConnection(this.buildConnectionOptions(options)));
  }

  protected registerConnection(connection: T) {
    this.connections[connection.id] = connection;
    // eslint-disable-next-line no-void
    void this.emit('connection', connection);
  }

  protected unregisterConnection(connection: T) {
    delete this.connections[connection.id];
    // eslint-disable-next-line no-void
    void this.emit('connectionClose', connection);
  }

  register<T extends object>(service: T, opts?: RegisterOptions): void;
  register<T extends object, K extends keyof T>(service: T, names: (K | string)[], opts?: RegisterOptions): void;
  register(name: string, handler: Handler, opts?: RegisterOptions): void;
  register<T extends object>(
    nameOrService: string | T,
    handler?: Handler | string[] | RegisterOptions,
    opts?: RegisterOptions,
  ) {
    return this.registry.register(<any>nameOrService, <any>handler, <any>opts);
  }

  unregister(pattern: string | string[]): string[] {
    return this.registry.unregister(pattern);
  }
}
