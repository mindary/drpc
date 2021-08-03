import {BufferReader, Writer} from '@libit/bufio';
import {Packer} from './types';
import {PacketMessages} from '../messages';
import {PacketType, ReversedPacketTypeType} from '../packet-type';
import {open} from './open';
import {ping} from './ping';
import {pong} from './pong';
import {call} from './call';
import {ack} from './ack';
import {signal} from './signal';
import {error} from './error';
import {connect} from './connect';
import {connectError} from './connect_error';

export * from './types';

export const packers: {
  [p in keyof ReversedPacketTypeType]: Packer<PacketMessages[ReversedPacketTypeType[p]]>;
} = {
  [PacketType.open]: open,
  [PacketType.connect]: connect,
  [PacketType.connect_error]: connectError,
  [PacketType.ping]: ping,
  [PacketType.pong]: pong,
  [PacketType.call]: call,
  [PacketType.ack]: ack,
  [PacketType.error]: error,
  [PacketType.signal]: signal,
};

export class Packers {
  static size(type: keyof ReversedPacketTypeType, message: any): number {
    assertPacketType(type);
    return packers[type].size(message as any);
  }

  static read<T extends keyof ReversedPacketTypeType, M = PacketMessages[ReversedPacketTypeType[T]]>(
    type: T,
    br: BufferReader,
  ): M {
    assertPacketType(type);
    return packers[type].read(br) as any;
  }

  static write(type: number, message: any, bw: Writer): void {
    assertPacketType(type);
    packers[type].write(message, bw);
  }
}

function assertPacketType(type: number) {
  if (!packers[type]) {
    throw new Error('Unknown message type.');
  }
}
