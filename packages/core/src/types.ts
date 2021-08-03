import {ValueOrPromise} from '@remly/types';

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

export type SignalHandler = (data: any) => ValueOrPromise<void>;
