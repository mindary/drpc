import {Counter} from './counter';
import {InvalidError} from './errors';

export class Monster {
  static namespace = 'monster';
  greet: (msg: string) => string;
  error: () => void;
  exception: () => void;
  incrementCounterBy: (counter: Counter, value: any) => Counter;
  add: (a: number, b: number) => number;
  addSlow: (a: number, b: number, isSlow?: boolean) => Promise<number>;
  sleep: (ms: number) => Promise<number>;
  empty: () => void;
  noArgs: () => boolean;
  invalidError: () => InvalidError;
}
