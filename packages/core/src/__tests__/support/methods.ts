import _delay from 'delay';
import {Counter} from './counter';
import {makeFailureError} from '../..';
import {InvalidError} from './errors';

export function error() {
  throw makeFailureError(-1000, 'An error message');
}

export function exception() {
  throw new Error('An exception message');
}

export function incrementCounterBy(counter: Counter, value: any) {
  if (!(counter instanceof Counter)) {
    throw makeFailureError(-1000, 'Argument not an instance of Counter');
  }
  counter.incrementBy(value);
  return counter;
}

export function add(a: number, b: number) {
  return a + b;
}

export async function addSlow(a: number, b: number, isSlow?: boolean) {
  const result = a + b;
  if (isSlow) await delay(15);
  return result;
}

export async function delay(ms: number) {
  await _delay(ms);
  return ms;
}

export function empty() {}

export function noArgs(): boolean {
  return true;
}

export function invalidError() {
  return new InvalidError();
}
