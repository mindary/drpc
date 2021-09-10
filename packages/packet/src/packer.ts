import {assert} from 'ts-essentials';
import {Options} from 'msgpackr/unpack';
import {Packr} from 'msgpackr';
import {BufferReader, PacketNumToType, PacketType, PacketTypeToNum} from './types';
import {crc32} from './crc32';
import {HeaderCodec, MessageCodecs, MetaCodec} from './codec';
import {HeaderType, MessageSchemas, MessageTypes, MetaType, Packet} from './packet';
import {Metadata, MetadataValue} from './metadata';

export interface PackerOptions extends Options {}

const EMPTY = Buffer.allocUnsafe(0);

export class Packer {
  readonly payloadPacker: Packr;

  constructor(options?: PackerOptions) {
    this.payloadPacker = new Packr(options);
  }

  pack<T extends PacketType>(packet: Packet<T>): Buffer;
  pack<T extends PacketType>(
    type: T,
    message: MessageTypes[T],
    metadata?: Metadata | Record<string, Buffer | Buffer[]>,
  ): Buffer;
  pack<T extends PacketType>(
    type: T | Packet<T>,
    message?: MessageTypes[T],
    metadata?: Metadata | Record<string, Buffer | Buffer[]>,
  ): Buffer {
    if (typeof type === 'object' && type.type != null) {
      metadata = type.metadata;
      message = type.message;
      type = type.type;
    }
    assert(typeof type === 'string', 'type must be string');
    assert(message, 'message must not be null');

    assert(MessageSchemas[type], `Unknown packet type: ${type}`);

    if ('payload' in MessageSchemas[type]) {
      message = {
        ...message,
        payload: this.payloadPacker.encode((message as any).payload),
      };
    }
    // encode metadata
    const metaObject = (metadata instanceof Metadata ? metadata?.export() : metadata) ?? {};
    const meta: MetaType = [];
    for (const key in metaObject) {
      const value = metaObject[key];
      meta.push({key, values: Array.isArray(value) ? value : [value]});
    }
    const metaBuf = meta ? MetaCodec.encode(meta) : EMPTY;

    // encode message
    const messageBuf = MessageCodecs[type].encode(message);

    // concat metadata and message
    const payload = Buffer.concat([metaBuf, messageBuf]);

    // encode header
    const size = payload.length;
    const checksum = crc32(payload);

    const header = HeaderCodec.encode({
      type: PacketTypeToNum[type],
      size,
      checksum,
    });

    return Buffer.concat([header, payload]);
  }

  unpack(data: Buffer): Packet;
  unpack(header: HeaderType, data: Buffer): Packet;
  unpack(headerOrData: HeaderType | Buffer, data?: Buffer): Packet {
    let header: HeaderType | undefined;
    if (Buffer.isBuffer(headerOrData)) {
      data = headerOrData;
      header = undefined;
    } else {
      header = headerOrData;
    }
    assert(data, 'data is required');
    const reader: BufferReader = {data, offset: 0};
    if (!header) {
      // decode header
      header = HeaderCodec.decode(reader);
    }

    // check sum
    assert(crc32(data, reader.offset) === header.checksum, 'Checksum dose not match');

    // decode meta
    const metaObject: Record<string, MetadataValue[]> = {};
    const meta = MetaCodec.decode(reader);
    for (const item of meta) {
      metaObject[item.key] = item.values;
    }
    const metadata = Metadata.from(metaObject);

    // decode message
    const type: PacketType = PacketNumToType[header.type];
    assert(type, `Unknown packet type: ${header.type}`);
    const message = MessageCodecs[type].decode(data.slice(reader.offset));

    if ('payload' in message) {
      message.payload = this.payloadPacker.unpack(message.payload);
    }
    return {type, metadata, message};
  }
}

export const packer = new Packer();
