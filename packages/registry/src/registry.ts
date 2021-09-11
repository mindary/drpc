import {assert} from 'ts-essentials';
import micromatch from 'micromatch';
import toArray from 'tily/array/toArray';
import debugFactory from 'debug';
import {Method, UnimplementedError} from '@drpc/core';
import {getAllRpcMethodMetadata, getDrpcMetadata} from '@drpc/decorators';
import flatten from 'tily/array/flatten';
import uniq from 'tily/array/uniq';

const debug = debugFactory('drpc:core:registry');

export interface ServiceInvokeRequest {
  name: string;
  params?: any;
  payload?: any; // alias for params
}

export interface Registrable {
  register<SERVICE extends object>(namespace: string, service: SERVICE, scope?: object): void;

  register<SERVICE extends object>(namespace: string, service: SERVICE, names: string[], scope?: object): void;

  register<SERVICE extends object>(service: SERVICE, scope?: object): void;

  register<SERVICE extends object>(service: SERVICE, names: string | string[], scope?: object): void;

  unregister(pattern: string | string[]): string[];
}

export interface Registry extends Registrable {
  readonly methods: Record<string, Method>;

  clear(): void;

  get(name: string): Method;

  call(name: string, args: any): Promise<any>;

  invoke(request: ServiceInvokeRequest): Promise<any>;
}

export class DefaultRegistry implements Registry {
  protected _methods: Record<string, Method> = {};

  get methods() {
    return this._methods;
  }

  register<SERVICE extends object>(namespace: string, service: SERVICE, scope?: object): void;
  register<SERVICE extends object>(namespace: string, service: SERVICE, names: string[], scope?: object): void;
  register<SERVICE extends object>(service: SERVICE, scope?: object): void;
  register<SERVICE extends object>(service: SERVICE, names: string | string[], scope?: object): void;
  register<SERVICE extends object>(
    namespace: string | SERVICE,
    service?: SERVICE | object | string,
    names?: string[] | object,
    scope?: object,
  ) {
    const args = resolveRegisterArgs(namespace, service, names, scope);
    if (args.namespace == null) {
      args.namespace = getDrpcMetadata(args.service.constructor)?.namespace ?? '';
    }

    // Using a fresh meta but not use direct MetadataMap for avoid poison the original metadata store
    const meta = Object.assign({}, getAllRpcMethodMetadata(args.service.constructor));
    if (args.names?.length) {
      uniq(
        flatten<string>(
          args.names.map(n =>
            n === '*'
              ? [
                  ...Object.getOwnPropertyNames(args.service),
                  ...Object.getOwnPropertyNames(args.service.constructor.prototype),
                ]
              : n,
          ),
        ),
      )
        .filter(n => typeof args.service[n] === 'function' && n !== 'constructor')
        .forEach(n => (meta[n] = meta[n] ?? {}));
    }

    for (const name of Object.keys(meta)) {
      if (typeof args.service[name] === 'function') {
        assert(!this._methods[name], `Method already bound: "${name}"`);
        const alias = meta[name].name ?? name;
        const qualified = args.namespace ? args.namespace + '.' + alias : alias;
        this._methods[qualified] = new Method(args.service[name], args.scope);
        if (debug.enabled) {
          debug(`register method: ${qualified}`);
        }
      }
    }
  }

  unregister(pattern: string | string[]): string[] {
    const keys = micromatch(Object.keys(this._methods), pattern);
    for (const key of keys) {
      delete this._methods[key];
    }
    return keys;
  }

  clear() {
    this._methods = {};
  }

  get(name: string) {
    const method = this._methods[name];
    if (!method) {
      throw new UnimplementedError(`Method not found: "${name}"`);
    }
    return method;
  }

  call(name: string, args: any): Promise<any> {
    return this.get(name).invoke(args);
  }

  async invoke(request: ServiceInvokeRequest) {
    const {name, params, payload} = request;
    return this.call(name, params ?? payload);
  }
}

// register<T extends object>(namespace: string, service: T, scope?: any): void;
// register<T extends object>(namespace: string, service: T, names: string[], scope?: any): void;
// register<T extends object>(service: T, scope?: any): void;
// register<T extends object>(service: T, names: string[], scope?: any): void;
function resolveRegisterArgs(
  arg1: any,
  arg2?: any,
  arg3?: any,
  arg4?: any,
): {
  namespace: string | undefined;
  service: any;
  names?: string[];
  scope?: any;
} {
  let namespace = undefined;
  let names: string[] | undefined;
  if (typeof arg1 === 'string') {
    namespace = arg1;
    arg1 = arg2;
    arg2 = arg3;
    arg3 = arg4;
  }

  if (Array.isArray(arg2) || typeof arg2 === 'string') {
    names = toArray(arg2);
    arg2 = arg3;
  }
  const service = arg1;
  const scope = arg2 ?? service;

  return {namespace, service, names, scope};
}
