import * as net from 'net';
import {RPC} from '../..';
import {TcpTransport} from './tcp';
import {Counter} from './counter';

export function buildConnectionListener(
  methods: {[name: string]: Function},
  errorHandler?: (err: Error) => void,
) {
  const errorListener = errorHandler ?? (() => undefined);
  return (conn: net.Socket) => {
    const transport = new TcpTransport(conn);
    transport.framer.register(Counter);
    // eslint-disable-next-line no-void
    transport.once('end', () => void rpc.close());

    const rpc = RPC.create(transport, {methods});
    rpc.on('error', errorListener);
  };
}

export function createServer(methods: {[name: string]: Function}) {
  return net.createServer(buildConnectionListener(methods));
}
