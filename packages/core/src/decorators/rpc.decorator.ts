import {ClassDecoratorFactory, MetadataAccessor, MetadataInspector, MetadataMap, MethodDecoratorFactory} from '@loopback/metadata';
import {Constructor} from '@drpc/types';

export interface DrpcMetadata {
  namespace?: string;
}

export const DRPC_METADATA = MetadataAccessor.create<DrpcMetadata, ClassDecorator>('drpc');


export type DrpcMethodMetadata = {
  name?: string;
};

export const DRPC_METHOD_METADATA = MetadataAccessor.create<DrpcMethodMetadata, MethodDecorator>('drpc:method');

/**
 * Decorate a socketio controller class to specify the namespace.
 *
 * @example
 * ```ts
 * @socketio({namespace: '/chats'})
 * export class SocketIoController {}
 * ```
 * @param spec A namespace or object
 */
export function drpc(spec: DrpcMetadata | string = {}) {
  if (typeof spec === 'string') {
    spec = {namespace: spec};
  }
  return ClassDecoratorFactory.createDecorator(DRPC_METADATA, spec);
}

export function getDrpcMetadata(controllerClass: Constructor<unknown>) {
  return MetadataInspector.getClassMetadata(DRPC_METADATA, controllerClass);
}


export namespace drpc {
  export function method(metadata?: DrpcMethodMetadata | string) {
    if (typeof metadata === 'string') {
      metadata = {name: metadata};
    }
    metadata = metadata ?? {};
    return MethodDecoratorFactory.createDecorator<DrpcMethodMetadata>(DRPC_METHOD_METADATA, metadata);
  }
}

/**
 * Fetch expose method metadata stored by `@drpc.method` decorator.
 *
 * @param serviceClass - Target service
 * @param methodName - Target method
 */
export function getRpcMethodMetadata(serviceClass: Constructor<unknown>, methodName: string): DrpcMethodMetadata {
  return (
    MetadataInspector.getMethodMetadata<DrpcMethodMetadata>(DRPC_METHOD_METADATA, serviceClass.prototype, methodName) ??
    ({} as DrpcMethodMetadata)
  );
}

/**
 * Fetch all method method metadata stored by `@drpc.method` decorator.
 *
 * @param serviceClass - Target service
 */
export function getAllRpcMethodMetadata(serviceClass: Constructor<unknown>): MetadataMap<DrpcMethodMetadata> {
  return (
    MetadataInspector.getAllMethodMetadata<DrpcMethodMetadata>(DRPC_METHOD_METADATA, serviceClass.prototype) ??
    ({} as MetadataMap<DrpcMethodMetadata>)
  );
}
