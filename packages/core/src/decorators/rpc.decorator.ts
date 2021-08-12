import {MetadataInspector, MetadataMap, MethodDecoratorFactory} from '@loopback/metadata';
import {Constructor} from '@remly/types';
import {EXPOSE_METADATA_LEY} from '../keys';

export type RPCProcedureMetadata = {
  name?: string;
};

export namespace rpc {
  export function procedure(metadata?: RPCProcedureMetadata | string) {
    if (typeof metadata === 'string') {
      metadata = {name: metadata};
    }
    metadata = metadata ?? {};
    return MethodDecoratorFactory.createDecorator<RPCProcedureMetadata>(EXPOSE_METADATA_LEY, metadata);
  }
}

/**
 * Fetch expose method metadata stored by `@rpc.procedure` decorator.
 *
 * @param serviceClass - Target service
 * @param methodName - Target method
 */
export function getRPCProcedureMetadata(serviceClass: Constructor<{}>, methodName: string): RPCProcedureMetadata {
  return (
    MetadataInspector.getMethodMetadata<RPCProcedureMetadata>(
      EXPOSE_METADATA_LEY,
      serviceClass.prototype,
      methodName,
    ) ?? {}
  );
}

/**
 * Fetch all expose method metadata stored by `@rpc.procedure` decorator.
 *
 * @param serviceClass - Target service
 */
export function getAllRPCProcedureMetadata(
  serviceClass: Constructor<{}>,
): MetadataMap<RPCProcedureMetadata> | undefined {
  return MetadataInspector.getAllMethodMetadata<RPCProcedureMetadata>(EXPOSE_METADATA_LEY, serviceClass.prototype);
}
