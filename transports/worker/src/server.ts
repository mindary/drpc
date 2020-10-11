import {URL} from 'url';
import {Server, ServerOptions} from '@remly/server';
import {Worker, WorkerOptions} from './worker';
import {WorkerConnection, WorkerConnectionOptions} from './connection';

export class WorkerServer extends Server<WorkerConnection> {
  constructor(options?: ServerOptions) {
    super(options);
  }

  protected createConnection<O>(options?: O): WorkerConnection {
    return new WorkerConnection(options);
  }

  open(filename: string | URL, options?: WorkerOptions) {
    const worker = new Worker(filename, options);
    return this.createAndRegisterConnection<WorkerConnectionOptions>({worker});
  }

  async close() {
    const connections = this.connections;
    await Promise.all(
      Object.values(connections).map((c: WorkerConnection) => {
        this.unregisterConnection(c);
        return c.end();
      }),
    );
  }
}
