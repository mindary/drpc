import {AddressInfo} from 'net';
import {RpcSuite} from '@remly/testsuite';
import {WebSocketClient} from '@remly/ws-client';
import {WebSocketServer} from '../../server';

describe('WebSocket - Suite', function () {
  RpcSuite.run(async () => {
    const app = RpcSuite.givenApplication();
    const server = new WebSocketServer(app, {port: 0});
    await server.start();

    const connection = app.once('connection');
    const clientSocket = WebSocketClient.connect('ws://localhost:' + (server.address as AddressInfo).port);
    RpcSuite.setupClient(clientSocket);
    const serverSocket = await connection;

    const close = async () => {
      await server.stop();
    };
    return {app, serverSocket, clientSocket, close};
  });
});
