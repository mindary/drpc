import net from 'net';
import tls from 'tls';
import debugFactory from 'debug';
import {MarkRequired} from 'ts-essentials';
import {TCPTransport} from '@drpc/transport-tcp';
import {Client, ClientOptions} from '@drpc/client';

const debug = debugFactory('drpc:client:tcp');

export function connect(client: Client, opts: ClientOptions & {servername?: string}) {
  opts.port = opts.port ?? 1999;
  opts.servername = opts.hostname = opts.host = opts.hostname ?? opts.host ?? opts.servername ?? 'localhost';

  if (opts.cert && opts.key) {
    opts.protocol = 'tls';
  }

  return new TCPTransport(
    opts.protocol === 'tcp' ? createTcpConnection(client, opts as any) : createTlsConnection(client, opts as any),
  );
}

function createTcpConnection(client: Client, opts: MarkRequired<ClientOptions, 'port'>) {
  debug('port %d and host %s', opts.port, opts.hostname);
  return net.createConnection(opts.port, opts.hostname);
}

function createTlsConnection(client: Client, opts: MarkRequired<ClientOptions, 'port'>) {
  opts.rejectUnauthorized = opts.rejectUnauthorized !== false;
  delete opts.path;
  debug('port %d host %s rejectUnauthorized %b', opts.port, opts.host, opts.rejectUnauthorized);

  const conn = tls.connect(opts);
  conn.on('secureConnect', function () {
    if (opts.rejectUnauthorized && !conn.authorized) {
      conn.emit('error', new Error('TLS not authorized'));
    } else {
      conn.removeListener('error', handleTLSErrors);
    }
  });

  function handleTLSErrors(err: Error) {
    // How can I get verify this error is a tls error?
    if (opts.rejectUnauthorized) {
      client.emit('error', err).catch(() => {});
    }

    // close this connection to match the behaviour of net
    // otherwise all we get is an error from the connection
    // and close event doesn't fire. This is a work around
    // to enable the reconnect code to work the same as with
    // net.createConnection
    conn.end();
  }

  return conn;
}
