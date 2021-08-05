import {Client, ClientOptions} from '@remly/client';
import {MessagePort} from './port';
import {WorkerTransport} from './transport';

export class ThreadWorker extends Client {
  constructor(port: MessagePort, options?: ClientOptions) {
    super({...options, transport: new WorkerTransport(port)});
  }
}
