import delay from 'delay';
import {Counter} from './counter';
import {InvalidError} from './errors';
import {RemoteError} from '../../errors';
import {MonsterType} from './monster.definition';

export class MonsterService implements MonsterType {
  foo = 'bar';

  prefix = 'Hello';

  greet(msg: string) {
    return this.prefix + ' ' + msg;
  }

  error() {
    throw new RemoteError(-1000, 'An error message');
  }

  exception() {
    throw new Error('An exception message');
  }

  incrementCounterBy(counter: Counter, value: any) {
    if (!(counter instanceof Counter)) {
      throw new RemoteError(-1000, 'Argument not an instance of Counter');
    }
    counter.incrementBy(value);
    return counter;
  }

  add(a: number, b: number) {
    return a + b;
  }

  async addSlow(a: number, b: number, isSlow?: boolean) {
    const result = a + b;
    if (isSlow) await delay(15);
    return result;
  }

  async sleep(ms: number) {
    await delay(ms);
    return ms;
  }

  empty() {}

  noArgs(): boolean {
    return true;
  }

  invalidError() {
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
