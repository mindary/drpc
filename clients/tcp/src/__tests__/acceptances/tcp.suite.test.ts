import {fromCallback} from 'a-callback';
import {RpcSuite} from '@drpc/testsuite';
import {tcp} from '@drpc/transport-tcp';
import {connect} from '@drpc/client';
import {createTcpServer} from '@drpc/testlab';
import * as channel from '../..';

describe('TCP - suite', function () {
  RpcSuite.run(async () => {
    const app = RpcSuite.givenApplication();
    const [server, port] = createTcpServer(tcp(app.handle));

    const connection = app.once('connection');
    const client = await connect(`tcp://localhost:${port}`, {
      channel,
    });
    RpcSuite.setupClient(client);
    const clientSocket = client.socket;
    const serverSocket = await connection;

    const close = async () => {
      await client.close();
      await fromCallback(cb => server.close(cb));
    };
    return {app, serverSocket, clientSocket, close};
  });
});