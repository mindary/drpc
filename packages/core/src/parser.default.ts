import {assert} from 'ts-essentials';
import {crc32} from './crc32';
import {Header, Packet} from './packet';
import {Parser} from './parser';

export class DefaultParser extends Parser {
  protected pending: Buffer[] = [];
  protected total = 0;
  protected waiting = 9;
  protected header?: Header;

  /**
   * Feed data to the parser.
   * @param {Buffer} data
   */

  feed(data: Buffer) {
    this.total += data.length;
    this.pending.push(data);

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
      this.parse(chunk);
    }
  }

  /**
   * Parse a fully-buffered chunk.
   * @param {Buffer} chunk
   */

  protected parse(chunk: Buffer) {
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
      packet = Packet.fromRaw(header.type, chunk);
    } catch (e) {
      this.error(e);
      return;
    }

    this.message(packet);
  }
}
