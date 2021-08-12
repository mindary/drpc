import {Counter} from './counter';
import {InvalidError} from './errors';

export const MonsterDefinition = {
  greet: {} as (msg: string) => string,

  error: {} as () => void,

  exception: {} as () => void,

  incrementCounterBy: {} as (counter: Counter, value: any) => Counter,

  add: {} as (a: number, b: number) => number,

  addSlow: {} as (a: number, b: number, isSlow?: boolean) => Promise<number>,

  sleep: {} as (ms: number) => Promise<number>,

  empty: {} as () => void,

  noArgs: {} as () => boolean,

  invalidError: {} as () => InvalidError,
};

export type MonsterService = typeof MonsterDefinition;
