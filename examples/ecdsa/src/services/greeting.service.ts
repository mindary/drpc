import {drpc} from '@drpc/registry';
import {Greeting, GreetingType} from './greeting.def';

@drpc(Greeting.name)
export class GreetingService implements GreetingType {
  prefix = 'Hello,';

  @drpc.method() greet(msg: string) {
    return this.prefix + ' ' + msg;
  }
}

export const greeting = new GreetingService();
