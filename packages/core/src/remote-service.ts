import {ValueOrPromise} from '@remly/types';
import {Callable} from './types';

export type Service = {
  [p: string]: (...args: any[]) => any;
};

export class RemoteService<S extends Service = Service> {
  constructor(protected readonly callable: Callable, protected readonly namespace?: string) {}

  call<K extends keyof S>(method: K, params?: Parameters<S[K]>, timeout?: number): ValueOrPromise<ReturnType<S[K]>> {
    const full = this.namespace ? `${this.namespace}.${method}` : <string>method;
    return <Promise<any>>this.callable.call(full, params, timeout);
  }
}
