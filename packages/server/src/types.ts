import {IncomingRequest, OutgoingRequest} from '@remly/core';
import {GenericInterceptor} from '@libit/interceptor';
import {Connection} from './connection';

export type ServerIncomingRequest = IncomingRequest<Connection>;
export type ServerOutgoingRequest = OutgoingRequest<Connection>;

export type ServerRequestHandler = GenericInterceptor<ServerIncomingRequest>;
export type ServerDispatchHandler = GenericInterceptor<ServerOutgoingRequest>;
