import {fromCallback} from 'a-callback';
import {tcp} from '@remly/transport-tcp';
import {Application} from '@remly/server';
import {connect} from '@remly/client';
import {ConnectivitySuite} from '@remly/testsuite';
import {createTcpServer} from '@remly/testlab';
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
