import {ValueOrPromise} from '@remly/types';
import {RemoteService} from './remote-service';

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

export interface WithRemoteService {
  service<S extends Service>(namespace?: string): RemoteService<S>;
}

export type RpcInvoke = (name: string, params: any) => ValueOrPromise<any>;

export type SignalHandler = (data: any) => ValueOrPromise<void>;
