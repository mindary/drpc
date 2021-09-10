import {build} from 'binio';
import {
  AckMessageSchema,
  AuthMessageSchema,
  CallMessageSchema,
  ConnackMessageSchema,
  ConnectMessageSchema,
  ErrorMessageSchema,
  HeaderSchema,
  HeartbeatMessageSchema,
  MessageCodecTypes,
  MetaSchema,
  SignalMessageSchema,
} from './packet';

export const HeaderCodec = build(HeaderSchema);

export const MetaCodec = build(MetaSchema);

export const ConnectMessageCodec = build(ConnectMessageSchema);
export const ConnackMessageCodec = build(ConnackMessageSchema);
export const HeartbeatMessageCodec = build(HeartbeatMessageSchema);
export const CallMessageCodec = build(CallMessageSchema);
export const AckMessageCodec = build(AckMessageSchema);
export const SignalMessageCodec = build(SignalMessageSchema);
export const ErrorMessageCodec = build(ErrorMessageSchema);
export const AuthMessageCodec = build(AuthMessageSchema);

export const MessageCodecs: MessageCodecTypes = {
  connect: ConnectMessageCodec,
  connack: ConnackMessageCodec,
  ping: HeartbeatMessageCodec,
  pong: HeartbeatMessageCodec,
  call: CallMessageCodec,
  ack: AckMessageCodec,
  signal: SignalMessageCodec,
  error: ErrorMessageCodec,
  auth: AuthMessageCodec,
} as const;
