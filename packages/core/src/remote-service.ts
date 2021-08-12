import {ValueOrPromise} from '@remly/types';
import {Callable} from './types';

export type ValueType<T> = T extends PromiseLike<infer U> ? U : T extends ValueOrPromise<infer U> ? U : T;
export type ReturnTypeOfMethod<T> = T extends (...args: Array<any>) => any ? ReturnType<T> : any;
export type ReturnTypeOfMethodIfExists<T, S> = S extends keyof T ? ReturnTypeOfMethod<T[S]> : any;
export type ReplaceReturnType<T extends (...a: any) => any, TNewReturn> = (...a: Parameters<T>) => TNewReturn;

export type GenericMethods = {[name: string]: (...args: any[]) => ValueOrPromise<any>};
export type RemoteMethods<T extends GenericMethods> = {
  [K in keyof T]: ReplaceReturnType<T[K], Promise<ValueType<ReturnTypeOfMethodIfExists<T, K>>>>;
};

export interface RemoteServiceBuildOptions {
  namespace?: string;
  timeout?: number;
}

export class RemoteService {
  protected constructor(
    readonly definition: GenericMethods,
    readonly callable: Callable,
    readonly namespace?: string,
    public timeout?: number,
  ) {
    Object.keys(definition).forEach(name => {
      (this as any)[name] = (...args: any[]): any => this.call(name, ...args);
    });
  }

  static build<T extends GenericMethods>(
    definition: T,
    callable: Callable,
    options?: RemoteServiceBuildOptions,
  ): RemoteMethods<typeof definition> {
    const {namespace, timeout} = options ?? {};
    return new RemoteService(definition, callable, namespace, timeout) as any;
  }

  protected call(method: string, ...args: any[]): any {
    const full = this.namespace ? `${this.namespace}.${method}` : <string>method;
    return <Promise<any>>this.callable.call(full, args, this.timeout);
  }
}
