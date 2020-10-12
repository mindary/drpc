import {TCPServer} from '@remly/tcp';
import {GreetingService} from './services/greeting-service';
import {ChineseGreeter} from './greeters/greeter-cn';
import {EnglishGreeter} from './greeters/greeter-en';

export interface GreetingApplicationOptions {
  server?: {
    port?: number;
    host?: string;
  };
  greeters?: Record<string, any>;
}

export class GreetingApplication {
  server: TCPServer;
  greetingService: GreetingService;

  constructor(options?: GreetingApplicationOptions) {
    options = options ?? {};
    this.server = TCPServer.createServer({...options, port: 3000});

    this.greetingService = new GreetingService();

    this.greetingService.addGreeter(new ChineseGreeter(options.greeters?.['chinese']));
    this.greetingService.addGreeter(new EnglishGreeter());

    this.server.register(this.greetingService);
  }

  async start() {
    await this.server.start();
  }

  async stop() {
    await this.server.stop();
  }

  async main() {
    await this.start();
  }
}
