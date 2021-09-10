import {Application, ApplicationOptions} from '@drpc/server';
import {RegistryMixin} from '@drpc/registry';
import {greeting} from './services/greeting.service';

export class GreetingApplication extends RegistryMixin(Application) {
  constructor(options?: ApplicationOptions) {
    super(options);

    this.register(greeting);
  }
}
