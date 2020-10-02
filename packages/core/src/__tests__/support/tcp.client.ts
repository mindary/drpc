import * as net from 'net';
import {RPC} from '../..';
import {TcpTransport} from './tcp';
import {Counter} from './counter';

export function createClient(
  port: number,
  host?: string,
  errorHandler?: (err: Error) => void,
): RPC;
export function createClient(
  port: number,
  errorHandler?: (err: Error) => void,
): RPC;
export function createClient(
  port: number,
  host?: string | ((err: Error) => void),
  errorHandler?: (err: Error) => void,
) {
  if (typeof host === 'function') {
    errorHandler = host;
    host = undefined;
  }
  const errorListener = errorHandler ?? (() => undefined);
  const transport = new TcpTransport(net.connect(port, host));
  transport.framer.register(Counter);

  const rpc = RPC.create(transport);
  rpc.on('error', errorListener);
  return rpc;
}
