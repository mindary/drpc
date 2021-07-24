import {Connection, Packet, ConnectionOptions} from '../..';

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
    await this.target.feed(packet.frame());
  }

  pipe<T extends Connection>(target: T): T {
    this.target = target;
    if (target) {
      this.doConnected().catch(e => {
        throw e;
      });
    }
    return target;
  }
}
