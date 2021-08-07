import getPort from 'get-port';
import {Application} from '@remly/server';
import {WebSocketClient} from '@remly/ws-client';
import {ConnectivitySuite} from '@remly/testsuite';
import {WebSocketServer} from '../../server';

ConnectivitySuite.run('WebSocket', async () => {
  const app = new Application();
  const port = await getPort();
  const server = new WebSocketServer(app, {port});
  await server.start();

  const connection = app.once('connect');
  const clientSocket = WebSocketClient.connect('ws://localhost:' + port);
  const serverSocket = await connection;
  const close = async () => {
    await clientSocket.close();
    await serverSocket.close();
    await server.stop();
  };
  return {app, serverSocket, clientSocket, close};
});
