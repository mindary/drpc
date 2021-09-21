import {
  ClassDecoratorFactory,
  MetadataAccessor,
  MetadataInspector,
  MetadataMap,
  MethodDecoratorFactory,
  ParameterDecoratorFactory,
} from '@loopback/metadata';
import {Constructor} from '@drpc/types';

export interface DrpcMetadata {
  namespace?: string;
}

export const DRPC_KEY = MetadataAccessor.create<DrpcMetadata, ClassDecorator>('drpc');

export type DrpcMethodMetadata = {
  name?: string;
};

export const DRPC_METHOD_KEY = MetadataAccessor.create<DrpcMethodMetadata, MethodDecorator>('drpc:method');

export type DrpcParameterMetadata = {
  target: Object;
  parameterIndex: number;
  selector: string;
};

export const DRPC_INJECT_METHOD_KEY = MetadataAccessor.create<DrpcParameterMetadata, MethodDecorator>(
  'drpc:parameters',
);
export const DRPC_INJECT_PARAMETERS_KEY = MetadataAccessor.create<DrpcParameterMetadata, ParameterDecorator>(
  'drpc:parameters',
);

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
  return ClassDecoratorFactory.createDecorator(DRPC_KEY, spec);
}

export function getDrpcMetadata(controllerClass: Constructor<unknown>) {
  return MetadataInspector.getClassMetadata(DRPC_KEY, controllerClass);
}

export namespace drpc {
  export function method(metadata?: DrpcMethodMetadata | string) {
    if (typeof metadata === 'string') {
      metadata = {name: metadata};
    }
    metadata = metadata ?? {};
    return MethodDecoratorFactory.createDecorator<DrpcMethodMetadata>(DRPC_METHOD_KEY, metadata);
  }

  export function params(selector: string) {
    return function markParameterAsInjected(target: Object, member: string | undefined, parameterIndex?: number) {
      if (typeof parameterIndex === 'number') {
        // The decorator is applied to a method parameter
        const paramDecorator: ParameterDecorator = ParameterDecoratorFactory.createDecorator<DrpcParameterMetadata>(
          DRPC_INJECT_PARAMETERS_KEY,
          {
            target,
            parameterIndex,
            selector,
          },
          // Do not deep clone the spec as only metadata is mutable and it's shallowly cloned
          {cloneInputSpec: false},
        );
        paramDecorator(target, member!, parameterIndex);
      } else {
        // It won't happen here as `@inject` is not compatible with ClassDecorator
        /* istanbul ignore next */
        throw new Error('@drpc.params can only be used on a method parameter');
      }
    };
  }

  export function request() {
    return params('request');
  }

  export function response() {
    return params('response');
  }
}

/**
 * Fetch expose method metadata stored by `@drpc.method` decorator.
 *
 * @param serviceClass - Target service
 * @param methodName - Target method
 */
export function getDrpcMethodMetadata(serviceClass: Constructor<unknown>, methodName: string): DrpcMethodMetadata {
  return (
    MetadataInspector.getMethodMetadata<DrpcMethodMetadata>(DRPC_METHOD_KEY, serviceClass.prototype, methodName) ??
    ({} as DrpcMethodMetadata)
  );
}

/**
 * Fetch all method method metadata stored by `@drpc.method` decorator.
 *
 * @param serviceClass - Target service
 */
export function getAllDrpcMethodMetadata(serviceClass: Constructor<unknown>): MetadataMap<DrpcMethodMetadata> {
  return (
    MetadataInspector.getAllMethodMetadata<DrpcMethodMetadata>(DRPC_METHOD_KEY, serviceClass.prototype) ??
    ({} as MetadataMap<DrpcMethodMetadata>)
  );
}
