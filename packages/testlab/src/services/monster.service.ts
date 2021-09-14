import delay from 'delay';
import {RemoteError} from '@drpc/core';
import {drpc} from '@drpc/decorators';
import {Monster} from './monster.def';

export class MonsterService implements Monster {
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

  /* istanbul ignore next */
  extraMethod1() {
    return 'extraMethod1';
  }

  extraMethod2() {
    return 'extraMethod2';
  }
}

export const monster = new MonsterService();
