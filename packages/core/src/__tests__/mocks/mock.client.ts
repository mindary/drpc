import {Connection, ConnectionOptions} from '../../connections';
import {MockServer} from './mock.server';
import {MockConnection} from './mock.connection';
import {DefaultRegistry} from '../../registry';
import {RegistryMixin} from '../../mixins';

export class MockClient extends RegistryMixin(MockConnection) {
  public target: Connection;

  constructor(options: ConnectionOptions = {}) {
    super(options);
    this.registry = this.registry ?? new DefaultRegistry();
  }

  static connect(server: MockServer, options?: ConnectionOptions) {
    return new this(options).connect(server);
  }

  async connect(server: MockServer) {
    await server.accept(this);
    return this;
  }
}
