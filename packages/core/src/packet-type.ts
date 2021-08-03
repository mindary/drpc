import {ValueOf} from 'ts-essentials';
import {ReverseMap} from '@remly/types';

export const PacketType = {
  open: 11,
  connect: 12,
  connect_error: 13,
  ping: 14,
  pong: 15,
  call: 21,
  ack: 22,
  error: 23,
  signal: 30,
};

export type PacketTypeType = typeof PacketType;
export type PacketTypeNameType = keyof PacketTypeType;
export type ReversedPacketTypeType = ReverseMap<PacketTypeType>;

export const PacketTypeNames: PacketTypeNameType[] = Object.keys(PacketType) as PacketTypeNameType[];
export const PacketTypeMap: ReversedPacketTypeType = PacketTypeNames.reduce((m, key) => {
  m[PacketType[key]] = key;
  return m;
}, {} as ReversedPacketTypeType);

export type PacketTypeKeyType = keyof PacketTypeType;
export type PacketTypeValueType = ValueOf<PacketTypeType>;
