import {GenericInterceptor} from '@libit/interceptor';
import {Connection} from './connection';

export type ConnectHandler = GenericInterceptor<Connection>;
