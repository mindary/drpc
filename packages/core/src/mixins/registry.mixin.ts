import {assert} from 'ts-essentials';
import {MixinTarget} from '../mixin-target';
import {DefaultRegistry, Registrable, Registry} from '../registry';
import {OnRequest} from '../sockets';
import {RequestInfo} from '../types';

export interface WithOnRequest {
  onrequest: OnRequest;
}

export function RegistryMixin<T extends MixinTarget<WithOnRequest>>(superClass: T) {
  return class extends superClass implements Registrable {
    /**
     * Server or Client service registry
     */
    registry: Registry;
    onrequest: OnRequest;

    constructor(...args: any[]) {
      super(...args);

      this.registry = (this as any).options?.registry ?? new DefaultRegistry();
      this.onrequest = async request => {
        if (request.isCall()) {
          request.result = await this.invokeWithRegistry(request.info);
        }
      };
    }

    async invokeWithRegistry(message: RequestInfo) {
      assert(this.registry, 'remote invoking is not supported for current connection');
      return this.registry.invoke(message);
    }

    register<SERVICE extends object>(namespace: string, service: SERVICE, scope?: object): void;
    register<SERVICE extends object>(namespace: string, service: SERVICE, names: string[], scope?: object): void;
    register<SERVICE extends object>(service: SERVICE, scope?: object): void;
    register<SERVICE extends object>(service: SERVICE, names: string | string[], scope?: object): void;
    register<SERVICE extends object>(namespace: any, service?: any, names?: any, scope?: any) {
      assert(this.registry, 'register is not supported for current connection');
      return this.registry.register(namespace, service, names, scope);
    }

    unregister(pattern: string | string[]): string[] {
      assert(this.registry, 'register is not supported for current connection');
      return this.registry.unregister(pattern);
    }
  };
}
