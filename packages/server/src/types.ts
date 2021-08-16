import {GenericInterceptor} from '@libit/interceptor';
import {CallContext, ConnectContext, Context} from '@remly/core';
import {Connection} from './connection';

export type ServerConnectContext = ConnectContext<Connection>;
export type ServerCallContext = CallContext<Connection>;

export type ServerRequestHandler<T extends Context<Connection> = Context<Connection>> = GenericInterceptor<T>;
export type ServerConnectHandler = ServerRequestHandler<ServerConnectContext>;
export type ServerCallHandler = ServerRequestHandler<ServerCallContext>;
