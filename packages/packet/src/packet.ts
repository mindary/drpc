import {BTDDataType, BTDSchema, Codec} from 'binio';
import {Modify, PacketType} from './types';
import {Metadata} from './metadata';

export const HeaderSchema = {
  type: 'uint8',
  size: 'uint32',
  checksum: 'uint32',
} as const;

export type HeaderType = BTDDataType<typeof HeaderSchema>;

export const MetaItemSchema = {
  key: 'string',
  values: ['buffer'],
} as const;

export const MetaSchema = [MetaItemSchema] as const;

export type MetaType = BTDDataType<typeof MetaSchema>;

export const ConnectMessageSchema = {
  protocolId: 'string',
  protocolVersion: 'uint8',
  keepalive: 'uint16',
  clientId: 'string',
} as const;

export type ConnectMessageType = Modify<BTDDataType<typeof ConnectMessageSchema>, {}>;

export const ConnackMessageSchema = {} as const;

export type ConnackMessageType = BTDDataType<typeof ConnackMessageSchema>;

export const AuthMessageSchema = {} as const;

export type AuthMessageType = Modify<BTDDataType<typeof AuthMessageSchema>, {}>;

export const HeartbeatMessageSchema = {
  payload: 'buffer',
} as const;

export type HeartbeatMessageType = Modify<
  BTDDataType<typeof HeartbeatMessageSchema>,
  {
    payload?: any;
  }
>;

export const EventMessageSchema = {
  name: 'string',
  payload: 'buffer',
} as const;

export type EventMessageType = Modify<
  BTDDataType<typeof EventMessageSchema>,
  {
    payload?: any;
  }
>;

export const CallMessageSchema = {
  id: 'uint32',
  name: 'string',
  payload: 'buffer', // [en/de]code with msgpack
} as const;

export type CallMessageType = Modify<
  BTDDataType<typeof CallMessageSchema>,
  {
    payload?: any;
  }
>;

export const AckMessageSchema = {
  id: 'uint32',
  payload: 'buffer',
} as const;

export type AckMessageType = Modify<
  BTDDataType<typeof AckMessageSchema>,
  {
    payload?: any;
  }
>;

export const ErrorMessageSchema = {
  id: 'uint32',
  code: 'int16',
  message: 'string',
} as const;

export type ErrorMessageType = BTDDataType<typeof ErrorMessageSchema>;

export const MessageSchemas: Record<PacketType, BTDSchema> = {
  connect: ConnectMessageSchema,
  connack: ConnackMessageSchema,
  auth: AuthMessageSchema,
  ping: HeartbeatMessageSchema,
  pong: HeartbeatMessageSchema,
  event: EventMessageSchema,
  call: CallMessageSchema,
  ack: AckMessageSchema,
  error: ErrorMessageSchema,
};

export type MessageType<T extends PacketType> = T extends 'connect'
  ? ConnectMessageType
  : T extends 'connack'
  ? ConnackMessageType
  : T extends 'event'
  ? EventMessageType
  : T extends 'call'
  ? CallMessageType
  : T extends 'ack'
  ? AckMessageType
  : T extends 'error'
  ? ErrorMessageType
  : T extends 'ping' | 'pong'
  ? HeartbeatMessageType
  : T extends 'auth'
  ? AuthMessageType
  : never;

export interface MessageTypes {
  connect: ConnectMessageType;
  connack: ConnackMessageType;
  ping: HeartbeatMessageType;
  pong: HeartbeatMessageType;
  event: EventMessageType;
  call: CallMessageType;
  ack: AckMessageType;
  error: ErrorMessageType;
  auth: AuthMessageType;
}

export type MessageCodecType<T extends PacketType> = Codec<MessageType<T>>;

export type MessageCodecTypes<T extends PacketType = PacketType> = Record<T, MessageCodecType<T>>;

export interface Packet<T extends PacketType = PacketType> {
  type: T;
  message: MessageTypes[T];
  metadata?: Metadata;
}
