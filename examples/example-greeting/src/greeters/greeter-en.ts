import {Greeter} from '../types';

/**
 * A greeter implementation for English
 */
export class EnglishGreeter implements Greeter {
  language = 'en';

  greet(name: string) {
    return `Hello, ${name}!`;
  }
}
