import {fromCallback} from 'a-callback';
import {RpcSuite} from '@drpc/testsuite';
import {connect} from '@drpc/client';
import {tcp} from '@drpc/server';
import {Certs, createTlsServer} from '@drpc/testlab';
import * as connector from '../../index';

describe('TLS - suite', function () {
  RpcSuite.run(async () => {
    const app = RpcSuite.givenApplication();
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
    RpcSuite.setupClient(client);
    const clientSocket = client;
    const serverSocket = await connection;

    const close = async () => {
      await client.close();
      await fromCallback(cb => server.close(cb));
    };
    return {app, serverSocket, clientSocket, close};
  });
});
