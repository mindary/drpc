import {Connection, Packet, ConnectionOptions} from '../../..';

export class MockConnection extends Connection {
  public target: Connection;

  constructor(options?: ConnectionOptions) {
    super(options);
    this.init();
  }

  protected bind() {
    //
  }

  protected close(): void {}

  pipe<T extends Connection>(target: T): T {
    this.target = target;
    if (target) {
      this.doConnected();
    }
    return target;
  }

  protected send(packet: Packet) {
    this.target.feed(packet.frame());
  }
}
