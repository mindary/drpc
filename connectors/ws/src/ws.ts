import WS from 'ws';
import {Client, ClientOptions} from '@drpc/client';
import debugFactory from 'debug';
import {buildUrl} from './common';

const debug = debugFactory('drpc:channel:ws');

export function createWebSocket(client: Client, opts: ClientOptions) {
  debug('createWebSocket');
  debug('protocol: ' + opts.protocolId + ' ' + opts.protocolVersion);
  const websocketSubProtocol = opts.protocolId ?? 'drpc';

  const url = buildUrl(opts, client);

  debug('creating new Websocket for url: ' + url + ' and protocol: ' + websocketSubProtocol);
  return new WS(url, [websocketSubProtocol], opts.wsOptions);
}
