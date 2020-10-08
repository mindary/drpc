import {BufferReader, StaticWriter} from '@tib/bufio';
import {crc32} from './crc32';

const DUMMY = Buffer.alloc(0);

export class Header {
  type = 0;
  size = 0;
  chk = 0;

  fromRaw(data: Buffer) {
    const br = new BufferReader(data);
    this.type = br.readU8();
    this.size = br.readU32();
    this.chk = br.readU32();
    return this;
  }

  static fromRaw(data: Buffer) {
    return new Header().fromRaw(data);
  }
}

/**
 * Packet
 * @constructor
 */

export const PacketTypes = {
  EVENT: 0,
  CALL: 1,
  ACK: 2,
  ERROR: 3,
  PING: 4,
  PONG: 5,
};

export class Packet {
  type = 0;
  id = 0;
  name = '';
  payload: Buffer = DUMMY;
  code = 0;
  msg = '';

  static types = PacketTypes;

  static fromRaw(type: number, data: Buffer) {
    return new Packet().fromRaw(type, data);
  }

  fromRaw(type: number, data: Buffer) {
    const br = new BufferReader(data);
    let id = -1;
    let name = '';
    let payload = DUMMY;
    let code = 0;
    let msg = '';
    let size;

    switch (type) {
      case Packet.types.EVENT:
        size = br.readU8();
        name = br.readString(size, 'ascii');
        payload = br.readBytes(br.left());
        break;
      case Packet.types.CALL:
        size = br.readU8();
        name = br.readString(size, 'ascii');
        id = br.readU32();
        payload = br.readBytes(br.left());
        break;
      case Packet.types.ACK:
        id = br.readU32();
        payload = br.readBytes(br.left());
        break;
      case Packet.types.ERROR:
        id = br.readU32();
        code = br.readU8();
        size = br.readU8();
        msg = br.readString(size, 'ascii');
        payload = br.readBytes(br.left());
        break;
      case Packet.types.PING:
        payload = br.readBytes(8);
        break;
      case Packet.types.PONG:
        payload = br.readBytes(8);
        break;
      default:
        throw new Error('Unknown message type.');
    }

    if (br.left() > 0) throw new Error('Trailing data.');

    this.type = type;
    this.id = id;
    this.name = name;
    this.payload = payload;
    this.code = code;
    this.msg = msg;

    return this;
  }

  getSize() {
    let size = 0;

    switch (this.type) {
      case Packet.types.EVENT:
        size += 1;
        size += this.name.length;
        size += this.payload.length;
        break;
      case Packet.types.CALL:
        size += 1;
        size += this.name.length;
        size += 4;
        size += this.payload.length;
        break;
      case Packet.types.ACK:
        size += 4;
        size += this.payload.length;
        break;
      case Packet.types.ERROR:
        size += 4;
        size += 1;
        size += 1;
        size += this.msg.length;
        size += this.payload.length;
        break;
      case Packet.types.PING:
        size += 8;
        break;
      case Packet.types.PONG:
        size += 8;
        break;
      default:
        throw new Error('Unknown message type.');
    }

    return size;
  }

  frame() {
    const size = this.getSize();
    const bw = new StaticWriter(size + 9);

    bw.writeU8(this.type);
    bw.writeU32(size);
    bw.writeU32(0);

    switch (this.type) {
      case Packet.types.EVENT:
        bw.writeU8(this.name.length);
        bw.writeString(this.name, 'ascii');
        bw.writeBytes(this.payload);
        break;
      case Packet.types.CALL:
        bw.writeU8(this.name.length);
        bw.writeString(this.name, 'ascii');
        bw.writeU32(this.id);
        bw.writeBytes(this.payload);
        break;
      case Packet.types.ACK:
        bw.writeU32(this.id);
        bw.writeBytes(this.payload);
        break;
      case Packet.types.ERROR:
        bw.writeU32(this.id);
        bw.writeU8(this.code);
        bw.writeU8(this.msg.length);
        bw.writeString(this.msg, 'ascii');
        bw.writeBytes(this.payload);
        break;
      case Packet.types.PING:
        bw.writeBytes(this.payload);
        break;
      case Packet.types.PONG:
        bw.writeBytes(this.payload);
        break;
      default:
        throw new Error('Unknown message type.');
    }

    const data = bw.render();
    data.writeUInt32LE(crc32(data.slice(9)), 5);
    return data;
  }
}
