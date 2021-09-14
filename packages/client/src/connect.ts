import debugFactory from 'debug';
import {assert} from 'ts-essentials';
import parseUrl from 'url-parse';
import {Client} from './client';
import {Connector, ClientOptions, ProtocolType} from './types';
import {protocols} from './protocols';
import {resolve} from './resolver';

const debug = debugFactory('drpc:client:connect');

const reconnects = Symbol('reconnects');

export async function connect(url: string, options?: ClientOptions): Promise<Client>;
export async function connect(options: ClientOptions): Promise<Client>;
export async function connect(urlOrOptions: string | ClientOptions, options?: ClientOptions): Promise<Client> {
  debug('connecting to an drpc broker...');
  let url: string | undefined;

  if (typeof urlOrOptions === 'string') {
    url = urlOrOptions;
  } else if (!options) {
    options = urlOrOptions;
    url = undefined;
  }

  let opts: ClientOptions = options ?? {};

  if (url) {
    const parsed = parseUrl(url, true);
    opts = Object.assign(
      parsed,
      {
        port: parsed.port == null ? undefined : Number(parsed.port),
      },
      opts,
    );

    assert(opts.protocol, 'Missing protocol');

    opts.protocol = opts.protocol.replace(/:$/, '') as ProtocolType;
  }

  // merge in the auth opts if supplied
  parseAuthOptions(opts);

  // support clientId passed in the query string of the url
  const {query} = opts as any;
  if (query && typeof query.clientId === 'string') {
    opts.clientId = query.clientId;
  }

  assert(opts.protocol, 'Missing protocol');

  const defaultProtocol = opts.protocol;
  let defaultConnector: Connector | undefined;
  let protocolPath: string | undefined;

  if (opts.connector) {
    if (typeof opts.connector === 'string') {
      protocolPath = opts.connector;
    } else {
      defaultConnector = opts.connector;
    }
  }

  if (!defaultConnector) {
    const resolved = await resolve(protocolPath ?? protocols[opts.protocol]);
    if (resolved.error) {
      throw new Error(resolved.error);
    }

    defaultConnector = resolved.module;
  }

  assert(defaultConnector, 'connector is not resolved');

  const servers = await Promise.all(
    opts.servers?.map(async s => {
      const protocol = s.protocol ?? defaultProtocol;
      const connector =
        protocol === defaultProtocol
          ? defaultConnector
          : protocols[protocol]
          ? (await resolve(protocols[protocol])).module ?? defaultConnector
          : defaultConnector;
      return {
        ...s,
        protocol,
        connector,
      };
    }) ?? [],
  );

  function wrapper(client: any) {
    client[reconnects] = client[reconnects] ?? 0;
    let connector = defaultConnector!;
    if (servers?.length > 0) {
      if (client[reconnects] >= servers.length) {
        client[reconnects] = 0;
      }
      const server = servers[client[reconnects]];
      connector = server.connector;
      opts.host = server.host;
      opts.port = server.port;
      opts.protocol = server.protocol;
      opts.hostname = opts.host;
      client[reconnects]++;
    }

    debug('connect for', opts.protocol);
    return connector.connect(client, opts);
  }

  return Client.connect(wrapper, opts);
}

/**
 * Parse the auth attribute and merge username and password in the options object.
 *
 * @param {ClientOptions} opts
 */
function parseAuthOptions(opts: ClientOptions) {
  if (opts.auth) {
    const matches = opts.auth.match(/^(.+):(.+)$/);
    if (matches) {
      opts.username = matches[1];
      opts.password = matches[2];
    } else {
      opts.username = opts.auth;
    }
  }
}
