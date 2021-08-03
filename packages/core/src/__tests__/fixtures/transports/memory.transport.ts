import {Transport, TransportOptions} from '../../..';

export interface MemoryTransportOptions extends TransportOptions {
  closeSensitive?: boolean;
}

export class MemoryTransport extends Transport {
  protected closeSensitive?: boolean;
  protected dest: MemoryTransport;

  constructor(options: MemoryTransportOptions = {}) {
    super(options);
    this.closeSensitive = options.closeSensitive;
  }

  pipe(dest: MemoryTransport) {
    this.dest = dest;
    return dest;
  }

  protected async doClose(reason: string | Error) {
    await super.doClose(reason);
    if (this.closeSensitive && this.dest.isOpen()) {
      await this.dest.close('destination closed');
    }
  }

  protected doSend(data: Buffer) {
    return this.dest.handleData(data);
  }
}
