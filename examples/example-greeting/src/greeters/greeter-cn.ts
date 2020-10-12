import {Greeter} from '../types';

/**
 * Options for the Chinese greeter
 */
export interface ChineseGreeterOptions {
  // Name first, default to `true`
  nameFirst: boolean;
}

/**
 * A greeter implementation for Chinese.
 */
export class ChineseGreeter implements Greeter {
  language = 'zh';

  constructor(private options: ChineseGreeterOptions = {nameFirst: true}) {}

  greet(name: string) {
    if (this.options?.nameFirst === false) {
      return `你好，${name}！`;
    }
    return `${name}，你好！`;
  }
}
