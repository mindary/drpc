import getPort from 'get-port';
import {Application} from '@remly/server';
import {ConnectivitySuite} from '@remly/testsuite';
import {WebSocketServer} from '../../server';
import * as http from 'http';
import {WebSocketClient} from '@remly/ws-client';

ConnectivitySuite.run('WebSocket', async () => {
  const app = new Application();
  const port = await getPort();
  const httpServer = http.createServer();
  WebSocketServer.attach(app, httpServer);
  httpServer.listen(port);

  const connection = app.once('connect');
  const clientSocket = WebSocketClient.connect('ws://localhost:' + port);
  const serverSocket = await connection;
  const close = async () => {
    await clientSocket.close();
    await serverSocket.close();
    httpServer.close();
  };
  return {app, serverSocket, clientSocket, close};
});
