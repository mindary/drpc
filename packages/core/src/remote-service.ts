import {ValueOrPromise} from '@drpc/types';
import {Callable, CallOptions} from './types';
import {Metadata} from '@drpc/packet';

export type ValueType<T> = T extends PromiseLike<infer U> ? U : T extends ValueOrPromise<infer U> ? U : T;
export type ReturnTypeOfMethod<T> = T extends (...args: Array<any>) => any ? ReturnType<T> : any;
export type ReturnTypeOfMethodIfExists<T, S> = S extends keyof T ? ReturnTypeOfMethod<T[S]> : any;
export type ReplaceReturnType<T extends (...a: any) => any, TNewReturn> = (...a: Parameters<T>) => TNewReturn;

export type ServiceMethods = {[name: string]: any};
export type RemoteMethods<T extends ServiceMethods> = {
  [K in keyof T]: ReplaceReturnType<T[K], Promise<ValueType<ReturnTypeOfMethodIfExists<T, K>>>>;
};

export type ServiceDefinition<T extends ServiceMethods> = {
  name: string;
  methods: T;
};

export class RemoteService<T extends ServiceMethods> {
  protected constructor(
    protected callable: Callable,
    protected proto: T,
    protected service?: string,
    protected metadata?: Metadata,
    protected options?: CallOptions,
  ) {
    Object.keys(proto).forEach(name => {
      const type = typeof proto[name];
      if (type === 'object' || type === 'function') {
        (this as any)[name] = (...args: any[]): any => this.call(name, args as any);
      }
    });
  }

  static build<T extends ServiceMethods>(
    callable: Callable,
    definition: ServiceDefinition<T>,
    metadata?: Metadata,
    options?: CallOptions,
  ): RemoteService<T> & RemoteMethods<T> {
    return new RemoteService<T>(callable, definition.methods, definition.name, metadata, options) as any;
  }

  call<K extends keyof T>(
    method: K,
    args: Parameters<T[K]>,
    metadata?: Metadata,
    options?: CallOptions,
  ): Promise<ValueType<ReturnTypeOfMethodIfExists<T, K>>> {
    const qualified = this.service ? `${this.service}.${method}` : method;
    return <Promise<any>>this.callable.call(qualified as string, args, metadata, options);
  }
}
