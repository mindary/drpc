import {CallablePacketType, Carrier, Request, RequestPacketType} from '@drpc/core';
import {GenericInterceptor} from '@libit/interceptor';
import {Connection} from './connection';

export type ServerRequest<T extends RequestPacketType = RequestPacketType> = Request<T, Connection>;
export type ServerCarrier<T extends RequestPacketType = RequestPacketType> = Carrier<T, Connection>;

export type ConnectHandler = GenericInterceptor<ServerCarrier<'connect'>>;
export type ServerIncomingHandler = GenericInterceptor<ServerCarrier<CallablePacketType>>;
export type ServerOutgoingHandler = GenericInterceptor<ServerRequest<CallablePacketType>>;
