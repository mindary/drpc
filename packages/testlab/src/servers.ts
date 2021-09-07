import * as net from 'net';
import {AddressInfo, ServerOpts, Socket} from 'net';
import * as tls from 'tls';
import {TlsOptions, TLSSocket} from 'tls';

export function createTcpServer(
  listener?: (socket: Socket) => void,
  opts?: ServerOpts & {port?: number},
): [net.Server, number] {
  const server = net.createServer(opts, listener);
  server.listen(opts?.port ?? 0);
  return [server, (server.address() as AddressInfo).port];
}

export function createTlsServer(
  listener: (socket: TLSSocket) => void,
  opts: TlsOptions & {port?: number},
): [tls.Server, number] {
  const server = tls.createServer(opts, listener);
  server.listen(opts?.port ?? 0);
  return [server, (server.address() as AddressInfo).port];
}
