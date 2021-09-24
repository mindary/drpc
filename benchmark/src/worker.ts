import net, {Server} from 'net';
import {once} from 'events';
import {WorkerApplication} from './worker.application';

/**
 * Run benchmark worker server
 */
export async function run(port: number, provider: string): Promise<Server> {
  const app = new WorkerApplication({provider});

  const server = net.createServer(app.accept());
  server.listen(port);
  await once(server, 'listening');
  return server;
}
