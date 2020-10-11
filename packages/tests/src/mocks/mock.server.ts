import {ConnectionOptions, Registry, Server} from '@remly/server';
import {MockConnection} from './mock.connection';
import {MockClient} from './mock.client';
import {DefaultRegistry} from '@remly/core';

export interface MockServerOptions {
  connection?: ConnectionOptions;
}

export class MockServer extends Server<MockConnection> {
  registry: Registry = new DefaultRegistry();
  options: MockServerOptions;

  constructor(options?: MockServerOptions) {
    super();
    this.options = options ?? {};
  }

  accept(client: MockClient) {
    const connection = this.createAndRegisterConnection();
    client.pipe(connection).pipe(client);
  }

  protected createConnection<O>(options?: O): MockConnection {
    return new MockConnection(options);
  }
}
