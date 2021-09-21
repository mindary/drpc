import {assert} from 'ts-essentials';
import {ActionPacketType, CallRequest, OnIncoming} from '@drpc/core';
import {MixinTarget} from '../mixin-target';
import {DefaultRegistry, Registrable, Registry} from '../registry';

export interface WithOnRequest {
  onincoming?: OnIncoming;
}

export function RegistryMixin<T extends MixinTarget<WithOnRequest>>(superClass: T) {
  return class extends superClass implements Registrable {
    /**
     * Server or Client service registry
     */
    registry: Registry;
    onincoming?: OnIncoming<ActionPacketType>;

    constructor(...args: any[]) {
      super(...args);

      this.registry = (this as any).options?.registry ?? new DefaultRegistry();
      this.onincoming = async (carrier, next) => {
        if (carrier.type === 'call') {
          return this.invokeWithRequest(carrier.req as CallRequest);
        }
        return next();
      };
    }

    async invokeWithRequest(request: CallRequest) {
      assert(this.registry, 'remote invoking is not supported for current socket');
      return this.registry.invoke(request);
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
