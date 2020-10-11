import {Connection, ConnectionOptions} from '../../connection';
import {MockServer} from './mock.server';
import {MockConnection} from './mock.connection';

export class MockClient extends MockConnection {
  public target: Connection;

  static connect(server: MockServer, options?: ConnectionOptions) {
    return new this(options).connect(server);
  }

  connect(server: MockServer) {
    server.accept(this);
    return this;
  }
}
