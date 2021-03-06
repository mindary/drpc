import net, {ServerOpts} from 'net';
import {once} from 'events';
import {Application, tcp} from '@drpc/server';

export async function setupServer(app: Application, opts?: ServerOpts & {port?: number}) {
  const server = net.createServer(opts, tcp(app.handle));
  server.listen(opts?.port);
  await once(server, 'listening');
  return server;
}
