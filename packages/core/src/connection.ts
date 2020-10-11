import {assert} from 'ts-essentials';
import {AbstractConnection, ConnectionDataEvents, ConnectionEmptyEvents, ConnectionOptions} from './abstract';
import {SignalHandler, SignalName} from './types';
import {Service} from './registry';
import {TypedService} from './typed-service';
import {syncl} from './utils';

export * from './abstract';

/**
 * Connection
 * @constructor
 * @ignore
 */
export abstract class Connection<
  DataEvents extends ConnectionDataEvents = ConnectionDataEvents,
  EmptyEvents extends SignalName = ConnectionEmptyEvents
> extends AbstractConnection<DataEvents & ConnectionDataEvents, EmptyEvents | ConnectionEmptyEvents> {
  protected constructor(options?: ConnectionOptions) {
    super(options);
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

  listen(signal: string, handler: SignalHandler) {
    assert(typeof signal === 'string', 'Signal must be a string.');
    assert(typeof handler === 'function', 'Handler must be a function.');
    return this._ee.on(signal, handler);
  }

  async signal(signal: string, data?: any) {
    assert(typeof signal === 'string', 'Event must be a string.');
    await this.sendSignal(signal, data);
  }
}
