import {ValueOrPromise} from '@remly/types';
import * as Buffer from 'buffer';

export type SignalName = string | symbol;

export interface Service {
  [name: string]: any;
}

export interface Callable {
  call(name: string, params?: any[], timeout?: number): ValueOrPromise<any>;
}

export type RPCReply = (result?: any) => ValueOrPromise<void>;
export type RPCInvoke = (name: string, params: any, reply: RPCReply) => ValueOrPromise<void>;

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
