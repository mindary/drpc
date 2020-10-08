import {Connection, ConnectionOptions} from '../../../connection';
import {MockServer} from './server';
import {Packet} from '../../../packet';

export class MockClient extends Connection {
  public target: Connection;

  static connect(server: MockServer, options?: ConnectionOptions) {
    return new this(options).connect(server);
  }

  constructor(options?: ConnectionOptions) {
    super(options);
    this.init();
  }

  protected bind() {
    //
  }

  protected close(): void {}

  protected send(packet: Packet) {
    this.target.feed(packet.frame());
  }

  pipe<T extends Connection>(target: T): T {
    this.target = target;
    if (target) {
      this.doConnected();
    }
    return target;
  }

  connect(server: MockServer) {
    server.accept(this);
    return this;
  }
}
