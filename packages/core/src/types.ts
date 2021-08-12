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

export type RpcReply = (result?: any) => ValueOrPromise<void>;
export type RpcInvoke = (name: string, params: any, reply: RpcReply) => ValueOrPromise<void>;

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
