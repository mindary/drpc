import {assert} from 'ts-essentials';
import {UnsubscribeFn} from 'emittery';
import {AbstractConnection} from './abstract.connection';
import {Service, SignalHandler} from '../types';
import {TypedService} from '../typed-service';
import {ConnectionOptions} from './types';
import {RegisterOptions, Registry} from '../registry';
import {Handler} from '../method';

export class Connection extends AbstractConnection {
  /**
   * Additional information that can be attached to the Connection instance
   */
  public data: Record<any, any> = {};

  public registry?: Registry;

  constructor(options: ConnectionOptions = {}) {
    super(options);

    this.registry = options.registry;

    if (!this.invoke) {
      this.invoke = (name, params, reply) => {
        assert(this.registry, 'remote invoking is not supported for current connection');
        return reply(this.registry.invoke(name, params));
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

  service<S extends Service>(namespace?: string): TypedService<S> {
    return new TypedService<Service>(this, namespace);
  }

  async call(method: string, params?: any, timeout?: number) {
    assert(typeof method === 'string', 'Event must be a string.');

    const id = this._sequence;

    if (++this._sequence === 0x100000000) this._sequence = 0;

    await this.sendCall(id, method, params);

    assert(!this._jobs[id], 'ID collision.');

    return new Promise((resolve, reject) => {
      this._jobs[id] = {timeout: timeout ?? this.requestTimeout, ts: Date.now(), resolve, reject};
    });
  }

  subscribe(signal: string, handler: SignalHandler): UnsubscribeFn {
    assert(typeof signal === 'string', 'Signal must be a string.');
    assert(typeof handler === 'function', 'Handler must be a function.');
    return this.remoteEmittery.on(signal, handler);
  }

  async signal(signal: string, data?: any) {
    assert(typeof signal === 'string', 'Event must be a string.');
    await this.sendSignal(signal, data);
  }
}
