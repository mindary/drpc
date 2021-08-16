import {assert} from 'ts-essentials';
import {MixinTarget} from '../mixin-target';
import {DefaultRegistry, Registrable, Registry} from '../registry';
import {OnCall} from '../sockets';
import {CallRequest} from '../types';

export interface WithOnCall {
  oncall: OnCall;
}

export function RegistryMixin<T extends MixinTarget<WithOnCall>>(superClass: T) {
  return class extends superClass implements Registrable {
    /**
     * Server or Client service registry
     */
    registry: Registry;
    oncall: OnCall;

    constructor(...args: any[]) {
      super(...args);

      this.registry = (this as any).options?.registry ?? new DefaultRegistry();
      this.oncall = async context => (context.result = await this.invokeWithRegistry(context.request));
    }

    async invokeWithRegistry(request: CallRequest) {
      assert(this.registry, 'remote invoking is not supported for current connection');
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
