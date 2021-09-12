import {drpc} from '@drpc/registry';
import {Greeting} from './greeting.def';

@drpc(Greeting.namespace)
export class GreetingService implements Greeting {
  prefix = 'Hello,';

  @drpc.method() greet(msg: string) {
    return this.prefix + ' ' + msg;
  }
}

export const greeting = new GreetingService();
