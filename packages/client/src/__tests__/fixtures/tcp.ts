import net from 'net';
import {MarkRequired} from 'ts-essentials';
import {TCPTransport} from '@drpc/transport-tcp';
import {Client, ClientOptions} from '../..';

export function connect(client: Client, opts: ClientOptions & {servername?: string}) {
  opts.port = opts.port ?? 3000;
  opts.servername = opts.hostname = opts.host = opts.hostname ?? opts.host ?? opts.servername ?? 'localhost';
  return new TCPTransport(createTcpConnection(client, opts as MarkRequired<ClientOptions, 'port'>));
}

function createTcpConnection(client: Client, opts: MarkRequired<ClientOptions, 'port'>) {
  return net.createConnection(opts.port, opts.hostname);
}
