import delay from 'delay';
import {RemoteError} from '@drpc/core';
import {drpc} from '@drpc/decorators';
import {Counter} from './counter';
import {InvalidError} from './errors';
import {MonsterType} from './monster.definition';

export class MonsterService implements MonsterType {
  foo = 'bar';

  prefix = 'Hello';

  @drpc.method() greet(msg: string) {
    return this.prefix + ' ' + msg;
  }

  @drpc.method() error() {
    throw new RemoteError({code: -1000, message: 'An error message'});
  }

  @drpc.method() exception() {
    throw new Error('An exception message');
  }

  @drpc.method() incrementCounterBy(counter: Counter, value: any) {
    if (!(counter instanceof Counter)) {
      throw new RemoteError({code: -1000, message: 'Argument not an instance of Counter'});
    }
    counter.incrementBy(value);
    return counter;
  }

  @drpc.method() add(a: number, b: number) {
    return a + b;
  }

  @drpc.method()
  async addSlow(a: number, b: number, isSlow?: boolean) {
    const result = a + b;
    if (isSlow) await delay(15);
    return result;
  }

  @drpc.method()
  async sleep(ms: number) {
    await delay(ms);
    return ms;
  }

  @drpc.method() empty() {}

  @drpc.method() noArgs(): boolean {
    return true;
  }

  @drpc.method() invalidError() {
    return new InvalidError();
  }

  extraMethod1() {
    return 'extraMethod1';
  }

  extraMethod2() {
    return 'extraMethod2';
  }
}

export const monster = new MonsterService();
