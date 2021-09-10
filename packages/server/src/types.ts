import {ActionPacketType, Carrier, Request, RequestPacketType, Transport} from '@drpc/core';
import {GenericInterceptor} from '@libit/interceptor';
import {Connection} from './connection';

export type ServerRequest<T extends RequestPacketType = RequestPacketType> = Request<T, Connection>;
export type ServerCarrier<T extends RequestPacketType = RequestPacketType> = Carrier<T, Connection>;

export type AuthHandler = GenericInterceptor<ServerCarrier<'auth'>>;
export type ServerIncomingHandler = GenericInterceptor<ServerCarrier<ActionPacketType>>;
export type ServerOutgoingHandler = GenericInterceptor<ServerRequest<ActionPacketType>>;

export type TransportHandler = (socket: Transport) => Connection;

export function isTransport(obj: any): obj is Transport {
  return (
    obj != null && typeof obj.ready === 'function' && typeof obj.send === 'function' && typeof obj.close === 'function'
  );
}
