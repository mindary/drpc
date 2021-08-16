import {assert} from 'ts-essentials';
import micromatch from 'micromatch';
import toArray from 'tily/array/toArray';
import debugFactory from 'debug';
import {Method} from './method';
import {UnimplementedError} from './errors';
import {getAllRpcMethodMetadata} from './decorators';
import flatten from 'tily/array/flatten';
import uniq from 'tily/array/uniq';

const debug = debugFactory('remly:core:registry');

export interface ServiceInvokeRequest {
  name: string;
  params?: any;
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

  call(name: string, params: any): Promise<any>;

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
  register(a: any, b?: any, c?: any, d?: any) {
    const {namespace, service, names, scope} = resolveRegisterArgs(a, b, c, d);
    // Using a fresh meta but not use direct MetadataMap for avoid poison the original metadata store
    const meta = Object.assign({}, getAllRpcMethodMetadata(service.constructor));
    if (names?.length) {
      uniq(
        flatten<string>(
          names.map(n =>
            n === '*'
              ? [...Object.getOwnPropertyNames(service), ...Object.getOwnPropertyNames(service.constructor.prototype)]
              : n,
          ),
        ),
      )
        .filter(n => typeof service[n] === 'function' && n !== 'constructor')
        .forEach(n => (meta[n] = meta[n] ?? {}));
    }

    for (const name of Object.keys(meta)) {
      if (typeof (service as any)[name] === 'function') {
        assert(!this._methods[name], `Method already bound: "${name}"`);
        const alias = meta[name].name ?? name;
        const qualified = namespace ? namespace + '.' + alias : alias;
        this._methods[qualified] = new Method((service as any)[name], scope);
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

  call(name: string, params: any): Promise<any> {
    return this.get(name).invoke(params);
  }

  async invoke(request: ServiceInvokeRequest) {
    const {name, params} = request;
    return this.call(name, params);
  }
}

// register<T extends object>(namespace: string, service: T, scope?: any): void;
// register<T extends object>(namespace: string, service: T, names: string[], scope?: any): void;
// register<T extends object>(service: T, scope?: any): void;
// register<T extends object>(service: T, names: string[], scope?: any): void;
function resolveRegisterArgs(
  a: any,
  b?: any,
  c?: any,
  d?: any,
): {
  namespace: string;
  service: any;
  names?: string[];
  scope?: any;
} {
  let namespace = '';
  let names: string[] | undefined;
  if (typeof a === 'string') {
    namespace = a;
    a = b;
    b = c;
    c = d;
  }

  if (Array.isArray(b) || typeof b === 'string') {
    names = toArray(b);
    b = c;
  }
  const service = a;
  const scope = b ?? service;

  return {namespace, service, names, scope};
}
