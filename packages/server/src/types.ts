import {Carrier, Request} from '@drpc/core';
import {GenericInterceptor} from '@libit/interceptor';
import {Connection} from './connection';

export type ServerRequest = Request<Connection>;
export type ServerCarrier = Carrier<Connection>;

export type ServerIncomingHandler = GenericInterceptor<ServerCarrier>;
export type ServerOutgoingHandler = GenericInterceptor<ServerRequest>;
