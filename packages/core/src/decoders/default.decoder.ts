import {Decoder} from './decoder';
import {Header, Packet} from '../packet';
import {crc32} from '../crc32';

export class DefaultDecoder extends Decoder {
  async feed(data: Buffer): Promise<void> {
    let header, packet;

    try {
      header = Header.fromRaw(data);
      if (header.size > Decoder.MAX_MESSAGE) {
        await this.error('Packet too large.');
        return;
      }
      data = data.slice(Header.size());
      packet = Packet.fromPayload(header.type, data);
    } catch (e) {
      await this.error(e);
      return;
    }

    if (header.chk !== crc32(data)) {
      await this.error('Checksum mismatch.');
      return;
    }

    await this.packet(packet);
  }

  dispose(): void {
    // no-op
  }
}
