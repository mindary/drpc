import {ValueOrPromise} from '@remly/types';
import {GenericInterceptor} from '@libit/interceptor';
import {Socket} from './sockets';
import {Carrier} from './carrier';
import {Request} from './request';

export type SignalName = string | symbol;

export interface Service {
  [name: string]: any;
}

export interface Callable {
  call(name: string, args?: any[], timeout?: number): ValueOrPromise<any>;
}

export interface NetAddress {
  readonly localAddress: string;
  readonly localPort: number;
  readonly remoteFamily?: string;
  readonly remoteAddress?: string;
  readonly remotePort?: number;
}

export type OnIncoming<SOCKET extends Socket = any> = GenericInterceptor<Carrier<SOCKET>>;
export type OnOutgoing<SOCKET extends Socket = any> = GenericInterceptor<Request<SOCKET>>;
