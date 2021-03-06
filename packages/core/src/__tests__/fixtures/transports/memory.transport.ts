import {Transport, TransportOptions} from '../../..';

export interface MemoryTransportOptions extends TransportOptions {
  closeSensitive?: boolean;
}

export class MemoryTransport extends Transport {
  options: MemoryTransportOptions;

  protected closeSensitive?: boolean;
  protected dest: MemoryTransport;

  constructor(options: MemoryTransportOptions = {}) {
    super(options);
    this.options = options;
    this.closeSensitive = options.closeSensitive;
    this.open();
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
    return this.dest.onData(data);
  }
}
