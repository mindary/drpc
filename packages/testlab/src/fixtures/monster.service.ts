import delay from 'delay';
import {expose, RemoteError} from '@remly/core';
import {Counter} from './counter';
import {InvalidError} from './errors';
import {MonsterType} from './monster.definition';

export class MonsterService implements MonsterType {
  foo = 'bar';

  prefix = 'Hello';

  @expose() greet(msg: string) {
    return this.prefix + ' ' + msg;
  }

  @expose() error() {
    throw new RemoteError({code: -1000, message: 'An error message'});
  }

  @expose() exception() {
    throw new Error('An exception message');
  }

  @expose() incrementCounterBy(counter: Counter, value: any) {
    if (!(counter instanceof Counter)) {
      throw new RemoteError({code: -1000, message: 'Argument not an instance of Counter'});
    }
    counter.incrementBy(value);
    return counter;
  }

  @expose() add(a: number, b: number) {
    return a + b;
  }

  @expose()
  async addSlow(a: number, b: number, isSlow?: boolean) {
    const result = a + b;
    if (isSlow) await delay(15);
    return result;
  }

  @expose()
  async sleep(ms: number) {
    await delay(ms);
    return ms;
  }

  @expose() empty() {}

  @expose() noArgs(): boolean {
    return true;
  }

  @expose() invalidError() {
    return new InvalidError();
  }
}

export const monster = new MonsterService();
