import {assert} from 'ts-essentials';
import micromatch from 'micromatch';
import {Handler, Method} from './method';
import {UnimplementedError} from './errors';
import {ExposeMetadata} from './types';
import {getAllExposeMetadata} from './decorators';

export interface RegisterOptions {
  namespace?: string;
  scope?: any;
}

export interface ServiceInvokeRequest {
  name: string;
  params?: any;
  // connection?: T;
}

export interface Registrable {
  register<T extends object>(service: T, opts?: RegisterOptions): void;
  register<T extends object, K extends keyof T>(service: T, names: (K | string)[], opts?: RegisterOptions): void;
  register(name: string, handler: Handler, opts?: RegisterOptions): void;
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

  register<T extends object>(service: T, opts?: RegisterOptions): void;
  register<T extends object, K extends keyof T>(service: T, names: (K | string)[], opts?: RegisterOptions): void;
  register(name: string, handler: Handler, opts?: RegisterOptions): void;
  register<T extends object>(
    nameOrService: string | T,
    handler?: Handler | string[] | RegisterOptions,
    opts?: RegisterOptions,
  ) {
    let scope;
    let service;
    let metadata: Record<string, ExposeMetadata> = {};
    if (typeof nameOrService === 'string') {
      assert(typeof handler === 'function', 'Handler must be a function.');
      service = {[nameOrService]: handler};
      metadata[nameOrService] = {};
    } else {
      service = scope = nameOrService;
      if (Array.isArray(handler)) {
        handler.forEach(name => (metadata[name] = {}));
      } else {
        opts = <RegisterOptions>handler;
        metadata = getAllExposeMetadata(service.constructor as any) ?? {};
      }
    }

    opts = opts ?? {};
    const namespace = opts.namespace;
    // prefer to use opts.scope then service
    scope = opts.scope ?? scope;

    for (const name of Object.keys(metadata)) {
      if (typeof (service as any)[name] === 'function') {
        assert(!this._methods[name], `Method already bound: "${name}"`);
        const alias = metadata[name].alias ?? name;
        const full = namespace ? namespace + '.' + alias : alias;
        this._methods[full] = new Method((service as any)[name], scope);
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
      throw new UnimplementedError();
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
