import {Transport, TransportOptions} from '@remly/core';

export interface MemoryTransportOptions extends TransportOptions {
  closeSensitive?: boolean;
}

export class MemoryTransport extends Transport {
  protected closeSensitive?: boolean;
  protected dest: MemoryTransport;

  constructor(options: MemoryTransportOptions = {}) {
    super(options);
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

export function givenMemoryTransportPair(options?: MemoryTransportOptions) {
  options = Object.assign(
    {
      closeSensitive: true,
    },
    options,
  );
  const t1 = new MemoryTransport(options);
  const t2 = new MemoryTransport(options);
  t1.pipe(t2).pipe(t1);
  return [t1, t2];
}
