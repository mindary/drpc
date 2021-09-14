import {Client, ClientOptions} from '@drpc/client';
import {buildUrl, setDefaultOpts} from './common';

export interface BrowserWSClientOptions extends ClientOptions {
  objectMode?: boolean;
  binary?: boolean;
}

export function setDefaultBrowserOpts(opts: ClientOptions): BrowserWSClientOptions {
  const options: BrowserWSClientOptions = setDefaultOpts(opts);

  if (!options.hostname) {
    options.hostname = options.host;
  }

  if (!options.hostname) {
    // Throwing an error in a Web Worker if no `hostname` is given, because we
    // can not determine the `hostname` automatically.  If connecting to
    // localhost, please supply the `hostname` as an argument.
    if (typeof document === 'undefined') {
      throw new Error('Could not determine host. Specify host manually.');
    }
    const parsed = new URL(document.URL);
    options.hostname = parsed.hostname;

    if (!options.port) {
      options.port = Number(parsed.port);
    }
  }

  // objectMode should be defined for logic
  if (options.objectMode == null) {
    options.objectMode = !(options.binary === true || options.binary === undefined);
  }

  return options;
}

export function createWebSocket(client: Client, opts: BrowserWSClientOptions) {
  const websocketSubProtocol = opts.protocolId ?? 'drpc';

  const url = buildUrl(opts, client);
  /* global WebSocket */
  const socket = new WebSocket(url, [websocketSubProtocol]);
  socket.binaryType = 'arraybuffer';
  return socket;
}
