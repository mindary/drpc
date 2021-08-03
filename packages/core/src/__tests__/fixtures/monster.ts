import delay from 'delay';
import {Counter} from './counter';
import {InvalidError} from './errors';
import {RemoteError} from '../../errors';
import {expose} from '../../decorders';
import {PickProperties} from 'ts-essentials';

export class Monster {
  foo = 'bar';

  prefix = 'Hello';

  @expose()
  greet(msg: string) {
    return this.prefix + ' ' + msg;
  }

  @expose()
  error() {
    throw new RemoteError(-1000, 'An error message');
  }

  @expose()
  exception() {
    throw new Error('An exception message');
  }

  @expose()
  incrementCounterBy(counter: Counter, value: any) {
    if (!(counter instanceof Counter)) {
      throw new RemoteError(-1000, 'Argument not an instance of Counter');
    }
    counter.incrementBy(value);
    return counter;
  }

  @expose()
  add(a: number, b: number) {
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

  @expose()
  empty() {}

  @expose()
  noArgs(): boolean {
    return true;
  }

  @expose()
  invalidError() {
    return new InvalidError();
  }
}

export type MonsterService = PickProperties<Monster, Function>;
export const monster = new Monster();
