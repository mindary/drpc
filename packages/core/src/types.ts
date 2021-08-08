import {ValueOrPromise} from '@remly/types';
import * as Buffer from 'buffer';

export type SignalName = string | symbol;

export type ExposeMetadata = {
  alias?: string;
};

export interface Service {
  [name: string]: any;
}

export interface Callable {
  call(name: string, params?: any[], timeout?: number): ValueOrPromise<any>;
}

export type RpcInvoke = (name: string, params: any) => ValueOrPromise<any>;

export type SignalHandler = (data?: any) => ValueOrPromise<void>;
export type AnySignalHandler = (event: string | symbol, data?: any) => ValueOrPromise<void>;

export interface AuthData {
  sid?: string; // ecdsa public key as sid
  tok?: string | Buffer; // token
  sig?: Buffer; // packed josa signature
  [key: string]: any;
}

export interface NetAddress {
  readonly localAddress: string;
  readonly localPort: number;
  readonly remoteFamily?: string;
  readonly remoteAddress?: string;
  readonly remotePort?: number;
}
