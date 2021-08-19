import {GenericInterceptor} from '@libit/interceptor';
import {ClientSocket, Request} from '@remly/core';

export type ClientRequest = Request<ClientSocket>;

export type ClientRequestHandler = GenericInterceptor<ClientRequest>;
export type ClientOutgoingHandler = GenericInterceptor<ClientRequest>;

export const CLIENT_UNSUBS = Symbol('client:unsubs');
