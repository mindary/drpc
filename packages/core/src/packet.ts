import {BufferReader, StaticWriter, Writer} from '@libit/bufio';
import {crc32} from './crc32';
import {Packers} from './packers';
import {PacketMessages} from './messages';
import {PacketType, PacketTypeKeyType, PacketTypeType, PacketTypeValueType} from './packet-types';

export interface HeaderProps {
  type: PacketTypeValueType;
  size: number;
  chk?: number;
}

export class Header implements HeaderProps {
  type: PacketTypeValueType = 0;
  size = 0;
  chk = 0;

  constructor(props?: HeaderProps) {
    Object.assign(this, props);
  }

  static size() {
    return 9;
  }

  static fromRaw(dataOrReader: Buffer | BufferReader) {
    return new Header().fromRaw(dataOrReader);
  }

  fromRaw(dataOrReader: Buffer | BufferReader) {
    const br = Buffer.isBuffer(dataOrReader) ? new BufferReader(dataOrReader) : dataOrReader;
    this.type = br.readU8();
    this.size = br.readU32();
    this.chk = br.readU32();
    return this;
  }

  write(writer: Writer) {
    writer.writeU8(this.type);
    writer.writeU32(this.size);
    writer.writeU32(this.chk);
  }

  updateCrc(data: Buffer, crc?: number) {
    data.writeUInt32LE(crc ?? crc32(data.slice(Header.size())), 5);
  }
}

export class Packet<T extends PacketTypeKeyType = any, M = PacketMessages[T]> {
  type: PacketTypeType[T];
  message: M;

  constructor(type: PacketTypeValueType | T, message?: M) {
    this.type = typeof type === 'string' ? PacketType[type] : type;
    this.message = message ?? ({} as M);
  }

  static create<T extends PacketTypeKeyType>(type: T, message?: PacketMessages[T]) {
    return new this(type, message);
  }

  static fromRaw(raw: Buffer): Packet;
  static fromRaw(header: Header, raw: Buffer): Packet;
  static fromRaw(headerOrRaw: Header | Buffer, raw?: Buffer): Packet {
    let header: Header | undefined;
    let data: Buffer = raw!;
    if (Buffer.isBuffer(headerOrRaw)) {
      data = headerOrRaw;
    } else {
      header = headerOrRaw;
    }
    const br = new BufferReader(data);
    if (!header) {
      header = Header.fromRaw(br);
    }
    return this.fromPayload(header.type, br);
  }

  static fromPayload(type: PacketTypeValueType, payloadOrReader: Buffer | BufferReader) {
    return new Packet(type).fromPayload(type, payloadOrReader);
  }

  getSize() {
    return Packers.size(this.type, this.message);
  }

  fromPayload(type: PacketTypeValueType, payloadOrReader: Buffer | BufferReader) {
    const br = Buffer.isBuffer(payloadOrReader) ? new BufferReader(payloadOrReader) : payloadOrReader;
    const message = Packers.read(type, br);

    if (br.left() > 0) throw new Error('Trailing data.');

    this.type = type;
    this.message = message as any;

    return this;
  }

  frame() {
    const size = this.getSize();
    const bw = new StaticWriter(size + Header.size());
    const header = new Header({
      type: this.type,
      size,
    });

    header.write(bw);
    Packers.write(this.type, this.message, bw);

    const data = bw.render();
    header.updateCrc(data);
    return data;
  }
}
