import {assert} from 'ts-essentials';
import {MixinTarget} from '../mixin-target';
import {DefaultRegistry, RegisterOptions, Registrable, Registry} from '../registry';
import {Handler} from '../method';
import {RpcInvoke} from '../types';

export function RegistryMixin<T extends MixinTarget<Record<any, any>>>(superClass: T) {
  return class extends superClass implements Registrable {
    /**
     * Server or Client service registry
     */
    public registry: Registry;

    public invoke: RpcInvoke;

    constructor(...args: any[]) {
      super(...args);

      this.registry = this.options?.registry ?? new DefaultRegistry();

      if (!this.invoke) {
        // set default registry based invoke function
        // can be set to other invoke mechanism
        //
        // e.g.
        //
        //  server.on('connection', connection => {
        //    const context = new SomeContext(app);
        //    connection.invoke = async (name, params, reply) => {
        //      ...
        //      await reply(invokeSomeThingWithContext(name, params, context));
        //    }
        //  });
        //
        this.invoke = (name, params) => {
          assert(this.registry, 'remote invoking is not supported for current connection');
          return this.registry.invoke({name, params});
        };
      }
    }

    register<S extends object>(service: S, opts?: RegisterOptions): void;
    register<S extends object, K extends keyof S>(service: S, names: (K | string)[], opts?: RegisterOptions): void;
    register(name: string, handler: Handler, opts?: RegisterOptions): void;
    register<S extends object>(
      nameOrService: string | S,
      handler?: Handler | string[] | RegisterOptions,
      opts?: RegisterOptions,
    ) {
      assert(this.registry, 'register is not supported for current connection');
      return this.registry.register(<any>nameOrService, <any>handler, <any>opts);
    }

    unregister(pattern: string | string[]): string[] {
      assert(this.registry, 'register is not supported for current connection');
      return this.registry.unregister(pattern);
    }
  };
}
