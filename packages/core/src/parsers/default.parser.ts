import {Parser} from './parser';
import {Header, Packet} from '../packet';
import {crc32} from '../crc32';

export class DefaultParser extends Parser {
  feed(data: Buffer): void {
    let header, packet;

    try {
      header = Header.fromRaw(data);
      if (header.size > Parser.MAX_MESSAGE) {
        this.error('Packet too large.');
        return;
      }
      data = data.slice(9);
      packet = Packet.fromRaw(header.type, data);
    } catch (e) {
      this.error(e);
      return;
    }

    if (header.chk !== crc32(data)) {
      this.error('Checksum mismatch.');
      return;
    }

    this.message(packet);
  }
}
