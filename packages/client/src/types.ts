import {GenericInterceptor} from '@libit/interceptor';
import {ClientSocket, Request} from '@remly/core';

export type ClientRequest = Request<ClientSocket>;

export type ClientRequestHandler = GenericInterceptor<ClientRequest>;
export type ClientDispatchHandler = GenericInterceptor<ClientRequest>;

export const CLIENT_UNSUBS = Symbol('client:unsubs');
