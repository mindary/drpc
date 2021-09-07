import * as Buffer from 'buffer';
import {ValueOf} from 'ts-essentials';
import {ReverseMap} from '@drpc/types';

export type Modify<T, R> = Omit<T, keyof R> & R;

export interface BufferReader {
  data: Buffer;
  offset: number;
}

export const PacketTypeToNum = {
  connect: 0x01,
  connack: 0x02,
  ping: 0x03,
  pong: 0x04,
  signal: 0x10,
  call: 0x11,
  ack: 0x12,
  error: 0x13,
};

export type PacketTypeToNumType = typeof PacketTypeToNum;
export type PacketType = keyof PacketTypeToNumType;
export type PacketTypeNum = ValueOf<PacketTypeToNumType>;
export type ReversedPacketType = ReverseMap<PacketTypeToNumType>;

export const PacketTypes: PacketType[] = Object.keys(PacketTypeToNum) as PacketType[];
export const PacketNumToType: ReversedPacketType = PacketTypes.reduce((m, key) => {
  m[PacketTypeToNum[key]] = key;
  return m;
}, {} as ReversedPacketType);
