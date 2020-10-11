import {Connection, Packet, ConnectionOptions} from '@remly/core';

export class MockConnection extends Connection {
  public target: Connection;

  constructor(options?: ConnectionOptions) {
    super(options);
    this.init();
  }

  protected bind() {
    //
  }

  protected async close() {}

  protected async send(packet: Packet) {
    this.target.feed(packet.frame());
  }

  pipe<T extends Connection>(target: T): T {
    this.target = target;
    if (target) {
      this.doConnected();
    }
    return target;
  }
}
