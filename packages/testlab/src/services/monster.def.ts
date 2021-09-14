export class Monster {
  static namespace = 'monster';
  greet: (msg: string) => string;
  error: () => void;
  exception: () => void;
  add: (a: number, b: number) => number;
  addSlow: (a: number, b: number, isSlow?: boolean) => Promise<number>;
  sleep: (ms: number) => Promise<number>;
  empty: () => void;
  noArgs: () => boolean;
}
