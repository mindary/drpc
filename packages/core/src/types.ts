import {ValueOrPromise} from '@remly/types';
import {GenericInterceptor} from '@libit/interceptor';
import {Request} from './request';
import {Socket} from './sockets';

export type SignalName = string | symbol;

export interface Service {
  [name: string]: any;
}

export interface Callable {
  call(name: string, args?: any[], timeout?: number): ValueOrPromise<any>;
}

export interface Metadata extends Record<string, any> {
  auth?: {
    sid?: string; // ecdsa public key as sid
    tok?: string | Buffer; // token
    sig?: Buffer; // signature
    [key: string]: any;
  };
}

export interface NetAddress {
  readonly localAddress: string;
  readonly localPort: number;
  readonly remoteFamily?: string;
  readonly remoteAddress?: string;
  readonly remotePort?: number;
}

export type OnRequest<SOCKET extends Socket = any> = GenericInterceptor<Request<SOCKET>>;
