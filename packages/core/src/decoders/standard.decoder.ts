/* eslint-disable @typescript-eslint/no-floating-promises */
import {assert} from 'ts-essentials';
import {Decoder} from './decoder';
import {crc32} from '../crc32';
import {Header, Packet} from '../packet';

export class StandardDecoder extends Decoder {
  protected pending: Buffer[];
  protected total: number;
  protected waiting: number;
  protected header?: Header;

  constructor() {
    super();
    this.reset();
  }

  reset() {
    this.total = 0;
    this.waiting = Header.size();
    this.pending = [];
    this.header = undefined;
  }

  dispose(): void {
    this.reset();
  }

  protected async doFeed(data: Buffer): Promise<void> {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    this.total += data.length;
    this.pending.push(buf);

    while (this.total >= this.waiting) {
      let off = 0,
        len = 0;
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
      this.decode(chunk);
    }
  }

  /**
   * Parse a fully-buffered chunk.
   * @param {Buffer} chunk
   */

  protected decode(chunk: Buffer) {
    assert(chunk.length <= this.MAX_MESSAGE);

    if (!this.header) {
      this.header = Header.fromRaw(chunk);
      this.waiting = this.header.size;
      if (this.waiting > this.MAX_MESSAGE) {
        this.waiting = 9;
        this.error('Packet too large.');
      }
      return;
    }

    const header = this.header;
    this.waiting = 9;
    this.header = undefined;

    if (header.chk !== crc32(chunk)) {
      this.error('Checksum mismatch.');
      return;
    }

    let packet;
    try {
      packet = Packet.fromPayload(header.type, chunk);
    } catch (e) {
      this.error(e);
      return;
    }

    this.packet(packet);
  }
}
