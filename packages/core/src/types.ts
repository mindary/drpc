import {ValueOrPromise} from '@drpc/types';
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

export type CallablePacketType = 'signal' | 'call';

export type OnIncoming<T extends CallablePacketType = CallablePacketType,
  SOCKET extends Socket = any,
  > = GenericInterceptor<Carrier<T, SOCKET>>;
export type OnOutgoing<T extends CallablePacketType = CallablePacketType,
  SOCKET extends Socket = any,
  > = GenericInterceptor<Request<T, SOCKET>>;
