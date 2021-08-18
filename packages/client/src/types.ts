import {GenericInterceptor} from '@libit/interceptor';
import {ClientSocket, IncomingRequest, OutgoingRequest} from '@remly/core';

export type ClientIncomingRequest = IncomingRequest<ClientSocket>;
export type ClientOutgoingRequest = OutgoingRequest<ClientSocket>;

export type ClientRequestHandler = GenericInterceptor<ClientIncomingRequest>;
export type ClientDispatchHandler = GenericInterceptor<ClientOutgoingRequest>;

export const CLIENT_UNSUBS = Symbol('client:unsubs');
