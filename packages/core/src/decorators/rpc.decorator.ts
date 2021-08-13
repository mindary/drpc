import {MetadataAccessor, MetadataInspector, MetadataMap, MethodDecoratorFactory} from '@loopback/metadata';
import {Constructor} from '@remly/types';

export type RPCMethodMetadata = {
  name?: string;
};

export const RPC_METHOD_METADATA = MetadataAccessor.create<RPCMethodMetadata, MethodDecorator>('rpc:method');

export namespace rpc {
  export function method(metadata?: RPCMethodMetadata | string) {
    if (typeof metadata === 'string') {
      metadata = {name: metadata};
    }
    metadata = metadata ?? {};
    return MethodDecoratorFactory.createDecorator<RPCMethodMetadata>(RPC_METHOD_METADATA, metadata);
  }
}

/**
 * Fetch expose method metadata stored by `@rpc.method` decorator.
 *
 * @param serviceClass - Target service
 * @param methodName - Target method
 */
export function getRPCMethodMetadata(serviceClass: Constructor<unknown>, methodName: string): RPCMethodMetadata {
  return (
    MetadataInspector.getMethodMetadata<RPCMethodMetadata>(RPC_METHOD_METADATA, serviceClass.prototype, methodName) ??
    ({} as RPCMethodMetadata)
  );
}

/**
 * Fetch all method method metadata stored by `@rpc.method` decorator.
 *
 * @param serviceClass - Target service
 */
export function getAllRPCMethodMetadata(serviceClass: Constructor<unknown>): MetadataMap<RPCMethodMetadata> {
  return (
    MetadataInspector.getAllMethodMetadata<RPCMethodMetadata>(RPC_METHOD_METADATA, serviceClass.prototype) ??
    ({} as MetadataMap<RPCMethodMetadata>)
  );
}
