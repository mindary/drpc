import delay from 'delay';
import {RemoteError, rpc} from '@remly/core';
import {Counter} from './counter';
import {InvalidError} from './errors';
import {MonsterType} from './monster.definition';

export class MonsterService implements MonsterType {
  foo = 'bar';

  prefix = 'Hello';

  @rpc.procedure() greet(msg: string) {
    return this.prefix + ' ' + msg;
  }

  @rpc.procedure() error() {
    throw new RemoteError({code: -1000, message: 'An error message'});
  }

  @rpc.procedure() exception() {
    throw new Error('An exception message');
  }

  @rpc.procedure() incrementCounterBy(counter: Counter, value: any) {
    if (!(counter instanceof Counter)) {
      throw new RemoteError({code: -1000, message: 'Argument not an instance of Counter'});
    }
    counter.incrementBy(value);
    return counter;
  }

  @rpc.procedure() add(a: number, b: number) {
    return a + b;
  }

  @rpc.procedure()
  async addSlow(a: number, b: number, isSlow?: boolean) {
    const result = a + b;
    if (isSlow) await delay(15);
    return result;
  }

  @rpc.procedure()
  async sleep(ms: number) {
    await delay(ms);
    return ms;
  }

  @rpc.procedure() empty() {}

  @rpc.procedure() noArgs(): boolean {
    return true;
  }

  @rpc.procedure() invalidError() {
    return new InvalidError();
  }
}

export const monster = new MonsterService();
