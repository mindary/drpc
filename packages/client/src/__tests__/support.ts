import net, {ServerOpts, AddressInfo} from 'net';
import {once} from 'events';
import {Application} from '@drpc/server';
import {tcp} from '@drpc/transport-tcp';
import {monster, Monster} from '@drpc/testlab';
import {noop} from 'ts-essentials';
import {ApplicationWithRegistry} from './fixtures/app';

export function givenApplication() {
  const a = new ApplicationWithRegistry();
  a.on('error', noop);
  a.register(Monster.namespace, monster);
  return a;
}

export async function setupServer(
  app: Application,
  opts?: ServerOpts & {port?: number},
): Promise<[net.Server, number]> {
  const server = net.createServer(opts, tcp(app.handle));
  server.listen(opts?.port);
  await once(server, 'listening');
  return [server, (server.address() as AddressInfo).port];
}
