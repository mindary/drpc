import {fromCallback} from 'a-callback';
import {tcp} from '@drpc/transport-tcp';
import {Application} from '@drpc/server';
import {connect} from '@drpc/client';
import {ConnectivitySuite} from '@drpc/testsuite';
import {createTcpServer} from '@drpc/testlab';
import * as channel from '../..';

describe('TCP - connectivity', function () {
  ConnectivitySuite.run('TCP', async () => {
    const app = new Application();
    const [server, port] = createTcpServer(tcp(app.handle));

    const connection = app.once('connection');
    const client = await connect(`tcp://localhost:${port}`, {
      channel,
    });
    const clientSocket = client.socket;
    const serverSocket = await connection;
    const close = async () => {
      await client.close();
      await fromCallback(cb => server.close(cb));
    };
    return {app, serverSocket, clientSocket, close};
  });
});
