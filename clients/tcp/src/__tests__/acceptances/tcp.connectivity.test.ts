import {fromCallback} from 'a-callback';
import {Application, tcp} from '@drpc/server';
import {connect} from '@drpc/client';
import {ConnectivitySuite} from '@drpc/testsuite';
import {createTcpServer} from '@drpc/testlab';
import {noop} from 'ts-essentials';
import * as channel from '../..';

describe('TCP - connectivity', function () {
  ConnectivitySuite.run('TCP', async () => {
    const app = new Application();
    const [server, port] = createTcpServer(tcp(app.handle));

    const connection = app.once('connection');

    const client = await connect(`tcp://localhost:${port}`, {
      channel,
    });
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
