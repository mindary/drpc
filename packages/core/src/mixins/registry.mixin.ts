import {assert} from 'ts-essentials';
import {MixinTarget} from '../mixin-target';
import {DefaultRegistry, Registrable, Registry} from '../registry';
import {RPCInvoke} from '../types';

export function RegistryMixin<T extends MixinTarget<Record<any, any>>>(superClass: T) {
  return class extends superClass implements Registrable {
    /**
     * Server or Client service registry
     */
    public registry: Registry;

    public invoke: RPCInvoke;

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
        this.invoke = async (name, params, reply) => {
          assert(this.registry, 'remote invoking is not supported for current connection');
          await reply(await this.registry.invoke({name, params}));
        };
      }
    }

    register<SERVICE extends object>(namespace: string, service: SERVICE, scope?: object): void;
    register<SERVICE extends object>(namespace: string, service: SERVICE, names: string[], scope?: object): void;
    register<SERVICE extends object>(service: SERVICE, scope?: object): void;
    register<SERVICE extends object>(service: SERVICE, names: string | string[], scope?: object): void;
    register<SERVICE extends object>(...args: any[]) {
      assert(this.registry, 'register is not supported for current connection');
      return this.registry.register(args[0], args[1], args[2], args[3]);
    }

    unregister(pattern: string | string[]): string[] {
      assert(this.registry, 'register is not supported for current connection');
      return this.registry.unregister(pattern);
    }
  };
}
