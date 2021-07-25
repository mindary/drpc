import {EventEmitter} from 'events';
import {MockConnection} from './mock.connection';
import {MockClient} from './mock.client';
import {ConnectionOptions} from '../../connections';
import {DefaultRegistry, RegisterOptions, Registry} from '../../registry';
import {Handler} from '../../method';
import {InvokeReply} from '../../types';

export interface MockServerOptions {
  connection?: ConnectionOptions;
}

export class MockServer extends EventEmitter {
  registry: Registry = new DefaultRegistry();
  options: MockServerOptions;

  connections: Record<string, MockConnection> = {};

  constructor(options?: MockServerOptions) {
    super();
    this.options = options ?? {};
  }

  async accept(client: MockClient) {
    const connection = this.createAndRegisterConnection();
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

  protected registerConnection(connection: MockConnection) {
    this.connections[connection.id] = connection;
    this.emit('connection', connection);
  }

  protected unregisterConnection(connection: MockConnection) {
    delete this.connections[connection.id];
    this.emit('connectionClose', connection);
  }

  protected buildConnectionOptions(options?: ConnectionOptions): ConnectionOptions {
    return {
      ...this.options.connection,
      ...options,
      invoke: (name: string, params: any, reply: InvokeReply) => reply(this.registry.invoke({name, params})),
    };
  }

  protected createConnection<O extends ConnectionOptions>(options?: O): MockConnection {
    return new MockConnection(options);
  }

  protected bindConnection(connection: MockConnection) {
    connection.on('close', () => {
      this.unregisterConnection(connection);
    });

    this.registerConnection(connection);

    return connection;
  }

  protected createAndRegisterConnection<O extends ConnectionOptions>(options?: O) {
    return this.bindConnection(this.createConnection(this.buildConnectionOptions(options)));
  }
}
