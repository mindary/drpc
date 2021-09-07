import {Client, ClientOptions, isBrowser} from '@drpc/client';
import merge from 'tily/object/merge';
import pick from 'tily/object/pick';

const WSS_OPTIONS: string[] = ['rejectUnauthorized', 'ca', 'cert', 'key', 'pfx', 'passphrase'];

export function buildUrl(opts: ClientOptions, client: Client) {
  let url = opts.protocol + '://' + opts.hostname + ':' + opts.port + opts.path;
  if (typeof opts.transformWsUrl === 'function') {
    url = opts.transformWsUrl(url, opts, client);
  }
  return url;
}

export function setDefaultOpts(opts: ClientOptions) {
  const options = opts;
  if (!opts.hostname) {
    options.hostname = 'localhost';
  }
  if (!opts.port) {
    if (opts.protocol === 'wss') {
      options.port = 443;
    } else {
      options.port = 80;
    }
  }
  if (!opts.path) {
    options.path = '/';
  }

  if (!opts.wsOptions) {
    options.wsOptions = {};
  }

  if (!isBrowser && opts.protocol === 'wss') {
    // Add cert/key/ca etc options
    options.wsOptions = merge(options.wsOptions, pick(WSS_OPTIONS, opts));
  }

  return options;
}
