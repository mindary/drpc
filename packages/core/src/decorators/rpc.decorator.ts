import {MetadataAccessor, MetadataInspector, MetadataMap, MethodDecoratorFactory} from '@loopback/metadata';
import {Constructor} from '@drpc/types';

export type RpcMethodMetadata = {
  name?: string;
};

export const Rpc_METHOD_METADATA = MetadataAccessor.create<RpcMethodMetadata, MethodDecorator>('rpc:method');

export namespace rpc {
  export function method(metadata?: RpcMethodMetadata | string) {
    if (typeof metadata === 'string') {
      metadata = {name: metadata};
    }
    metadata = metadata ?? {};
    return MethodDecoratorFactory.createDecorator<RpcMethodMetadata>(Rpc_METHOD_METADATA, metadata);
  }
}

/**
 * Fetch expose method metadata stored by `@rpc.method` decorator.
 *
 * @param serviceClass - Target service
 * @param methodName - Target method
 */
export function getRpcMethodMetadata(serviceClass: Constructor<unknown>, methodName: string): RpcMethodMetadata {
  return (
    MetadataInspector.getMethodMetadata<RpcMethodMetadata>(Rpc_METHOD_METADATA, serviceClass.prototype, methodName) ??
    ({} as RpcMethodMetadata)
  );
}

/**
 * Fetch all method method metadata stored by `@rpc.method` decorator.
 *
 * @param serviceClass - Target service
 */
export function getAllRpcMethodMetadata(serviceClass: Constructor<unknown>): MetadataMap<RpcMethodMetadata> {
  return (
    MetadataInspector.getAllMethodMetadata<RpcMethodMetadata>(Rpc_METHOD_METADATA, serviceClass.prototype) ??
    ({} as MetadataMap<RpcMethodMetadata>)
  );
}
