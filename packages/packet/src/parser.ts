import {assert} from 'ts-essentials';
import {Emittery} from '@libit/emittery';
import {ValueOrPromise} from '@drpc/types';
import {HeaderCodec} from './codec';
import {HeaderType, Packet} from './packet';
import {packer} from './packer';

const HEADER_SIZE = HeaderCodec.encode({type: 0, size: 0, checksum: 0}).byteLength;

export const DefaultMaxPacketSize = 10 * 1024 * 1024;

export class Parser extends Emittery<{
  error: Error;
  packet: Packet;
}> {
  #maxPacketSize: number;

  protected pending: Buffer[];
  protected total: number;
  protected waiting: number;
  protected header?: HeaderType;

  constructor(maxPacketSize?: number) {
    super();
    this.maxPacketSize = maxPacketSize ?? DefaultMaxPacketSize;
    this.reset();
  }

  get maxPacketSize() {
    return this.#maxPacketSize;
  }

  set maxPacketSize(maxPacketSize: number) {
    assert(maxPacketSize > 0, 'maxPacketSize must be greater than 0');
    this.#maxPacketSize = maxPacketSize;
  }

  reset() {
    this.total = 0;
    this.waiting = HEADER_SIZE;
    this.pending = [];
    this.header = undefined;
  }

  feed(data: Buffer | Uint8Array | string): ValueOrPromise<void> {
    return this.doFeed(Buffer.isBuffer(data) ? data : Buffer.from(data));
  }

  /**
   * Emit an error.
   * @private
   * @param {String} msg
   */
  protected async error(msg: string) {
    await this.emit('error', new Error(msg));
  }

  protected async packet(packet: Packet) {
    await this.emit('packet', packet);
  }

  protected async doFeed(data: Buffer): Promise<void> {
    this.total += data.length;
    this.pending.push(data);

    while (this.total >= this.waiting) {
      let off = 0;
      let len = 0;
      const chunk = Buffer.allocUnsafe(this.waiting);

      while (off < chunk.length) {
        len = this.pending[0].copy(chunk, off);
        if (len === this.pending[0].length) {
          this.pending.shift();
        } else {
          this.pending[0] = this.pending[0].slice(len);
        }
        off += len;
      }

      assert(off === chunk.length);

      this.total -= chunk.length;
      await this.decode(chunk);
    }
  }

  /**
   * Parse a fully-buffered chunk.
   */
  protected async decode(chunk: Buffer) {
    assert(chunk.length <= this.maxPacketSize);

    if (!this.header) {
      this.header = HeaderCodec.decode(chunk);
      this.waiting = this.header.size;
      if (this.waiting > this.maxPacketSize) {
        this.waiting = HEADER_SIZE;
        await this.error('Packet too large.');
      }
      return;
    }

    this.packet(packer.unpack(this.header, chunk)).catch(console.error);

    this.header = undefined;
    this.waiting = HEADER_SIZE;
  }
}
