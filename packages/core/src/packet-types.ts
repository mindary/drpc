import {ValueOf} from 'ts-essentials';
import {ReverseMap} from '@remly/types';

export const PacketType = {
  open: 10,
  connect: 11,
  connect_error: 12,
  signal: 20,
  call: 30,
  ack: 31,
  error: 32,
  ping: 40,
  pong: 41,
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
