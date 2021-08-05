import http from 'http';
import getPort from 'get-port';
import {RPCSuite} from '@remly/testsuite';
import {WebSocketClient} from '@remly/ws-client';
import {WebSocketServer} from '../../server';

RPCSuite.run('TCP', async () => {
  const app = RPCSuite.givenApplication();
  const port = await getPort();
  const httpServer = http.createServer();
  WebSocketServer.attach(app, httpServer);
  httpServer.listen(port);

  const connection = app.once('connect');
  const clientSocket = WebSocketClient.connect('ws://localhost:' + port);
  RPCSuite.setupClient(clientSocket);
  const serverSocket = await connection;

  const close = async () => {
    await serverSocket.close();
    await clientSocket.close();
    httpServer.close();
  };
  return {app, serverSocket, clientSocket, close};
});
