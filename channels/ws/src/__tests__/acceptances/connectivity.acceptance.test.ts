import {AddressInfo} from 'net';
import {Application} from '@remly/server';
import {WebSocketClient} from '@remly/ws-client';
import {ConnectivitySuite} from '@remly/testsuite';
import {WebSocketServer} from '../../server';

ConnectivitySuite.run('WebSocket', async () => {
  const app = new Application();
  const server = new WebSocketServer(app, {port: 0});
  await server.start();

  const connection = app.once('connect');
  const clientSocket = WebSocketClient.connect('ws://localhost:' + (server.address as AddressInfo).port);
  const serverSocket = await connection;
  const close = async () => {
    await server.stop();
  };
  return {app, serverSocket, clientSocket, close};
});
