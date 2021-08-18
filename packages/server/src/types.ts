import {Request} from '@remly/core';
import {GenericInterceptor} from '@libit/interceptor';
import {Connection} from './connection';

export type ServerRequest = Request<Connection>;

export type ServerRequestHandler = GenericInterceptor<ServerRequest>;
export type ServerDispatchHandler = GenericInterceptor<ServerRequest>;
