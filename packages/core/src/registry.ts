import {assert} from 'ts-essentials';
import micromatch from 'micromatch';
import {Handler, Method} from './method';
import {UnimplementedError} from './error';
import {isPlainObject, protoKeys} from './utils';

export interface Service {
  [name: string]: any;
}

export interface RegisterOptions {
  namespace?: string;
  scope?: any;
}

export interface Registry {
  readonly methods: Record<string, Method>;
  register<T extends object>(service: T, opts?: RegisterOptions): void;
  register<T extends object, K extends keyof T>(service: T, names: (K | string)[], opts?: RegisterOptions): void;
  register(name: string, handler: Handler, opts?: RegisterOptions): void;
  unregister(pattern: string | string[]): string[];
  clear(): void;
  get(name: string): Method;
  invoke(name: string, params?: any): Promise<any>;
}

export class DefaultRegistry implements Registry {
  protected _methods: Record<string, Method> = {};

  get methods() {
    return this._methods;
  }

  register<T extends object>(service: T, opts?: RegisterOptions): void;
  register<T extends object, K extends keyof T>(service: T, names: (K | string)[], opts?: RegisterOptions): void;
  register(name: string, handler: Handler, opts?: RegisterOptions): void;
  register<T extends object>(
    nameOrService: string | T,
    handler?: Handler | string[] | RegisterOptions,
    opts?: RegisterOptions,
  ) {
    let names: Set<string> | undefined = undefined;
    let scope;
    let service;
    if (typeof nameOrService === 'string') {
      assert(typeof handler === 'function', 'Handler must be a function.');
      service = {[nameOrService]: handler};
    } else {
      service = scope = nameOrService;
      if (Array.isArray(handler)) {
        names = new Set<string>(handler);
      } else {
        opts = <RegisterOptions>handler;
      }
    }

    opts = opts ?? {};
    const namespace = opts.namespace;
    // prefer to use opts.scope then service
    scope = opts.scope ?? scope;

    if (!names) {
      names = new Set(Object.keys(service));
      if (!isPlainObject(service)) {
        protoKeys(service).forEach(names.add, names);
      }
    }

    for (const name of names)
      if (typeof (service as any)[name] === 'function') {
        assert(!this._methods[name], `Method already bound: "${name}"`);
        const full = namespace ? namespace + '.' + name : name;
        this._methods[full] = new Method((service as any)[name], scope);
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
      throw new UnimplementedError();
    }
    return method;
  }

  async invoke(name: string, params?: any) {
    return this.get(name).invoke(params);
  }
}
