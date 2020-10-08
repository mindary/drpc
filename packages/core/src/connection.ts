import {assert} from 'ts-essentials';
import {AbstractConnection, ConnectionDataEvents, ConnectionEmptyEvents} from './abstract';
import {EventHandler, EventName} from './types';
import {Service} from './registry';
import {TypedService} from './typed-service';

export * from './abstract';

/**
 * Connection
 * @constructor
 * @ignore
 */
export abstract class Connection<
  DataEvents extends ConnectionDataEvents = ConnectionDataEvents,
  EmptyEvents extends EventName = ConnectionEmptyEvents
> extends AbstractConnection<DataEvents & ConnectionDataEvents, EmptyEvents | ConnectionEmptyEvents> {
  call(method: string, params?: any, timeout?: number) {
    assert(typeof method === 'string', 'Event must be a string.');

    const id = this._sequence;

    if (++this._sequence === 0x100000000) this._sequence = 0;

    this.sendCall(id, method, params);

    assert(!this._jobs[id], 'ID collision.');

    return new Promise((resolve, reject) => {
      this._jobs[id] = {timeout: timeout ?? this.requestTimeout, ts: Date.now(), resolve, reject};
    });
  }

  listen(event: EventName, handler: EventHandler) {
    assert(typeof event === 'string', 'Event must be a string.');
    assert(typeof handler === 'function', 'Handler must be a function.');
    return this._ee.on(event, handler);
  }

  fire(event: string, data?: any) {
    assert(typeof event === 'string', 'Event must be a string.');
    this.sendEvent(event, data);
  }

  service<S extends Service>(namespace?: string): TypedService<S> {
    return new TypedService<Service>(this, namespace);
  }
}
