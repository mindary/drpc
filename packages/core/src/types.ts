import {AsyncOrSync} from 'ts-essentials';

export type Constructor<T> = new (...args: any[]) => T;

export type SignalName = string | symbol;

export type SignalHandler = (...args: any[]) => AsyncOrSync<any>;

export type ExposeMetadata = {
  alias?: string;
};

export type InvokeReply = (result?: any) => AsyncOrSync<void>;

export type InvokeFn = (name: string, params: any, reply: InvokeReply) => AsyncOrSync<void>;

export interface Service {
  [name: string]: any;
}
