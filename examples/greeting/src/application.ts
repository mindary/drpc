import {ApplicationOptions, ApplicationWithRegistry} from '@drpc/server';
import {greeting} from './services/greeting.service';

export class GreetingApplication extends ApplicationWithRegistry {
  constructor(options?: ApplicationOptions) {
    super(options);

    this.register(greeting);
  }
}
