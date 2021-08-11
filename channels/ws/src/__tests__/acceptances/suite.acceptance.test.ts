import {AddressInfo} from 'net';
import {RPCSuite} from '@remly/testsuite';
import {WebSocketClient} from '@remly/ws-client';
import {WebSocketServer} from '../../server';

RPCSuite.run('TCP', async () => {
  const app = RPCSuite.givenApplication();
  const server = new WebSocketServer(app, {port: 0});
  await server.start();

  const connection = app.once('connect');
  const clientSocket = WebSocketClient.connect('ws://localhost:' + (server.address as AddressInfo).port);
  RPCSuite.setupClient(clientSocket);
  const serverSocket = await connection;

  const close = async () => {
    await server.stop();
  };
  return {app, serverSocket, clientSocket, close};
});
