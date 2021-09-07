import delay from 'delay';
import {RemoteError, rpc} from '@drpc/core';
import {Counter} from './counter';
import {InvalidError} from './errors';
import {MonsterType} from './monster.definition';

export class MonsterService implements MonsterType {
  foo = 'bar';

  prefix = 'Hello';

  @rpc.method() greet(msg: string) {
    return this.prefix + ' ' + msg;
  }

  @rpc.method() error() {
    throw new RemoteError({code: -1000, message: 'An error message'});
  }

  @rpc.method() exception() {
    throw new Error('An exception message');
  }

  @rpc.method() incrementCounterBy(counter: Counter, value: any) {
    if (!(counter instanceof Counter)) {
      throw new RemoteError({code: -1000, message: 'Argument not an instance of Counter'});
    }
    counter.incrementBy(value);
    return counter;
  }

  @rpc.method() add(a: number, b: number) {
    return a + b;
  }

  @rpc.method()
  async addSlow(a: number, b: number, isSlow?: boolean) {
    const result = a + b;
    if (isSlow) await delay(15);
    return result;
  }

  @rpc.method()
  async sleep(ms: number) {
    await delay(ms);
    return ms;
  }

  @rpc.method() empty() {}

  @rpc.method() noArgs(): boolean {
    return true;
  }

  @rpc.method() invalidError() {
    return new InvalidError();
  }
}

export const monster = new MonsterService();
