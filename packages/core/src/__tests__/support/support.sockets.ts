import {Emittery} from '@libit/emittery';
import {MemoryTransport, MemoryTransportOptions} from '../fixtures/transports';
import {ClientSocket, ClientSocketOptions, ServerSocket, ServerSocketOptions} from '../../sockets';

export interface SocketsOptions {
  ignoreErrors?: boolean;
  client?: Partial<ClientSocketOptions>;
  server?: Partial<ServerSocketOptions>;
  transport?: MemoryTransportOptions;
}

export function givenMemoryTransportPair(options?: MemoryTransportOptions) {
  const t1 = new MemoryTransport(options);
  const t2 = new MemoryTransport(options);
  t1.pipe(t2).pipe(t1);
  return [t1, t2];
}

export function givenSocketPair(id: string, options: SocketsOptions = {}): [ServerSocket, ClientSocket] {
  const [t1, t2] = givenMemoryTransportPair(options.transport);
  const server = new ServerSocket(t1, options.server);
  const client = new ClientSocket(options.client).attach(t2);
  if (options.ignoreErrors) {
    server.on('error', () => {});
    client.on('error', () => {});
  }
  return [server, client];
}

export function onceConnected(...emitters: Emittery<any>[]) {
  return Promise.all(emitters.map(e => e.once('connected')));
}
