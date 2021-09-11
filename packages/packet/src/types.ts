import * as Buffer from 'buffer';
import {ValueOf} from 'ts-essentials';
import {ReverseMap} from '@drpc/types';

export type Modify<T, R> = Omit<T, keyof R> & R;

export interface BufferReader {
  data: Buffer;
  offset: number;
}

export const PacketTypeToNum = {
  connect: 1,
  connack: 2,
  ping: 3,
  pong: 4,
  event: 5,
  call: 6,
  ack: 7,
  error: 8,
  auth: 9,
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
