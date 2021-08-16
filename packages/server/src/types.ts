import {GenericInterceptor} from '@libit/interceptor';
import {CallContext, ConnectContext} from '@remly/core';
import {Connection} from './connection';

export type ServerConnectContext = ConnectContext<Connection>;
export type ServerCallContext = CallContext<Connection>;

export type ServerConnectHandler = GenericInterceptor<ServerConnectContext>;
export type ServerCallHandler = GenericInterceptor<ServerCallContext>;
