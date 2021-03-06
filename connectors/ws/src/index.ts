import debugFactory from 'debug';
import {Client, ClientOptions} from '@drpc/client';
import {WebSocketTransport} from '@drpc/transport-ws';
import {setDefaultOpts} from './common';
import {createWebSocket} from './ws';

const debug = debugFactory('drpc:connector:ws');

export function connect(client: Client, opts: ClientOptions) {
  debug('connect');

  if (opts.cert && opts.key) {
    opts.protocol = 'wss';
  }

  const options = setDefaultOpts(opts);
  const socket = createWebSocket(client, options);
  return new WebSocketTransport(socket, opts);
}
