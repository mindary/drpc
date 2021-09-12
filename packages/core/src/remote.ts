import {ReturnTypeOfMethodIfExists, ServiceMethods, ValueType} from '@drpc/types';
import {Callable, CallOptions} from './types';
import {Metadata} from '@drpc/packet';

export class RemoteService<T extends ServiceMethods> {
  constructor(protected callable: Callable, protected namespace?: string) {}

  call<K extends keyof T>(
    method: K,
    args?: Parameters<T[K]>,
    options?: CallOptions,
  ): Promise<ValueType<ReturnTypeOfMethodIfExists<T, K>>>;
  call<K extends keyof T>(
    method: K,
    args?: Parameters<T[K]>,
    metadata?: Metadata,
    options?: CallOptions,
  ): Promise<ValueType<ReturnTypeOfMethodIfExists<T, K>>>;
  call<K extends keyof T>(
    method: K,
    args?: Parameters<T[K]>,
    metadata?: Metadata | CallOptions,
    options?: CallOptions,
  ): Promise<ValueType<ReturnTypeOfMethodIfExists<T, K>>> {
    if (metadata && !Metadata.isMetadata(metadata)) {
      options = metadata;
      metadata = undefined;
    }
    const m = method.toString();
    const qualified = this.namespace ? `${this.namespace}.${m}` : m;
    return <Promise<any>>this.callable.call(qualified, args, metadata, options);
  }
}
