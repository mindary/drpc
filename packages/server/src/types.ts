import {GenericInterceptor} from '@libit/interceptor';
import {Connection} from './connection';

export interface MiddlewareContext {
  connection: Connection;
}

export type MiddlewareInterceptor = GenericInterceptor<MiddlewareContext>;
