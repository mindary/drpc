import WS from 'ws';
import {Client, ClientOptions} from '@remly/client';
import debugFactory from 'debug';
import {buildUrl} from './common';

const debug = debugFactory('remly:channel:ws');

export function createWebSocket(client: Client, opts: ClientOptions) {
  debug('createWebSocket');
  debug('protocol: ' + opts.protocolId + ' ' + opts.protocolVersion);
  const websocketSubProtocol = opts.protocolId ?? 'remly';

  const url = buildUrl(opts, client);

  debug('creating new Websocket for url: ' + url + ' and protocol: ' + websocketSubProtocol);
  return new WS(url, [websocketSubProtocol], opts.wsOptions);
}
