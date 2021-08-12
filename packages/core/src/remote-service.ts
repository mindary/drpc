import {ValueOrPromise} from '@remly/types';
import {Callable} from './types';

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
    readonly callable: Callable,
    readonly proto: T,
    readonly service?: string,
    public timeout?: number,
  ) {
    Object.keys(proto).forEach(name => {
      const type = typeof proto[name];
      if (type === 'object' || type === 'function') {
        (this as any)[name] = (...args: any[]): any => this.call(name, ...args);
      }
    });
  }

  static build<T extends ServiceMethods>(
    callable: Callable,
    definition: ServiceDefinition<T>,
    timeout?: number,
  ): RemoteMethods<T> {
    return new RemoteService<T>(callable, definition.methods, definition.name, timeout) as any;
  }

  protected call(method: string, ...args: any[]): any {
    const qualified = this.service ? `${this.service}.${method}` : method;
    return <Promise<any>>this.callable.call(qualified, args, this.timeout);
  }
}
