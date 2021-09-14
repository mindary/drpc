import {ConnectivitySuite} from '@drpc/testsuite';
import {Application, tcp} from '@drpc/server';
import {connect} from '@drpc/client';
import {fromCallback} from 'a-callback';
import {Certs, createTlsServer} from '@drpc/testlab';
import * as connector from '../../index';
import {noop} from 'ts-essentials';

describe('TLS - connectivity', function () {
  ConnectivitySuite.run('TCP', async () => {
    const app = new Application();
    const [server, port] = createTlsServer(tcp(app.handle), {
      key: Certs.tlsKey,
      cert: Certs.tlsCert,
    });

    const connection = app.once('connection');
    const client = await connect(`tls://localhost:${port}`, {
      connector,
      ca: [Certs.tlsCert],
    });
    client.on('error', console.error);
    const clientSocket = client;
    const serverSocket = await connection;

    // ignore errors
    clientSocket.on('error', noop);
    serverSocket.on('error', noop);

    const close = async () => {
      await client.close();
      await fromCallback(cb => server.close(cb));
    };
    return {app, serverSocket, clientSocket, close};
  });
});
