import {AddressInfo} from 'net';
import {RpcSuite} from '@remly/testsuite';
import {TCPClient} from '@remly/tcp-client';
import {TCPServer} from '../../server';

describe('TCP - Suite', function () {
  RpcSuite.run(async () => {
    const app = RpcSuite.givenApplication();
    const server = new TCPServer(app, {port: 0});
    await server.start();

    const connection = app.once('connection');
    const client = TCPClient.connect((server.address as AddressInfo).port);
    RpcSuite.setupClient(client);
    const clientSocket = client.socket;
    const serverSocket = await connection;

    const close = async () => {
      await server.stop();
    };
    return {app, serverSocket, clientSocket, close};
  });
});
