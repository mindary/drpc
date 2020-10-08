import {EventEmitter} from 'events';
import {MockConnection} from './connection';
import {MockClient} from './client';
import {ConnectionOptions} from '../../../abstract';
import {RegisterOptions, Registry} from '../../../registry';
import {Handler} from '../../../method';

export interface MockServerOptions {
  connection?: ConnectionOptions;
}

export class MockServer extends EventEmitter {
  registry: Registry = new Registry();
  options: MockServerOptions;

  protected connections: Record<string, MockConnection> = {};

  constructor(options?: MockServerOptions) {
    super();
    this.options = options ?? {};
  }

  protected registerConnection(connection: MockConnection) {
    this.connections[connection.id] = connection;
    // eslint-disable-next-line no-void
    void this.emit('connection', connection);
  }

  protected unregisterConnection(connection: MockConnection) {
    delete this.connections[connection.id];
    // eslint-disable-next-line no-void
    void this.emit('connectionClose', connection);
  }

  protected buildConnectionOptions(options?: ConnectionOptions): ConnectionOptions {
    return {
      ...this.options.connection,
      ...options,
      registry: this.registry,
    };
  }

  protected createConnection<O>(options?: O): MockConnection {
    return new MockConnection(options);
  }

  protected bindConnection(connection: MockConnection) {
    connection.on('close', () => {
      this.unregisterConnection(connection);
    });

    this.registerConnection(connection);

    return connection;
  }

  protected createAndBindConnection<O>(options?: O) {
    return this.bindConnection(this.createConnection(this.buildConnectionOptions(options)));
  }

  accept(client: MockClient) {
    const connection = this.createAndBindConnection();
    client.pipe(connection).pipe(client);
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
}
