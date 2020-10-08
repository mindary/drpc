import delay from 'delay';
import {RemError} from '../../error';
import {Counter} from './counter';
import {InvalidError} from './errors';

export class Monster {
  foo = 'bar';

  prefix = 'Hello';

  greet(msg: string) {
    return this.prefix + ' ' + msg;
  }

  error() {
    throw new RemError({code: -1000, message: 'An error message'});
  }

  exception() {
    throw new Error('An exception message');
  }

  incrementCounterBy(counter: Counter, value: any) {
    if (!(counter instanceof Counter)) {
      throw new RemError({code: -1000, message: 'Argument not an instance of Counter'});
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
}

export const monster = new Monster();
