/**
 * Options for the greeter extension point
 */
import {Greeter} from '../types';
import * as chalk from 'chalk';
import {expose} from '@remly/core/dist/decorders';

export interface GreetingServiceOptions {
  color: string;
  greeters?: Greeter[];
}

export class GreetingService {
  protected greeters: Greeter[];

  constructor(public readonly options?: GreetingServiceOptions) {
    this.greeters = options?.greeters ?? [];
  }

  addGreeter(greeter: Greeter) {
    this.greeters.push(greeter);
  }

  /**
   * Find a greeter that can speak the given language
   * @param language - Language code for the greeting
   */
  async findGreeter(language: string): Promise<Greeter | undefined> {
    // Get the latest list of greeters
    const greeters = this.greeters;
    // Find a greeter that can speak the given language
    return greeters.find(g => g.language === language);
  }

  /**
   * Greet in the given language
   * @param language - Language code
   * @param name - Name
   */
  @expose()
  async greet(language: string, name: string): Promise<string> {
    let greeting = '';

    const greeter = await this.findGreeter(language);
    if (greeter) {
      greeting = greeter.greet(name);
    } else {
      // Fall back to English
      greeting = `Hello, ${name}!`;
    }
    if (this.options?.color) {
      greeting = chalk.keyword(this.options.color)(greeting);
    }
    return greeting;
  }
}
