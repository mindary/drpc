import getPort from 'get-port';
import {Application} from '@remly/server';
import {ConnectivitySuite} from '@remly/testsuite';
import {TCPClient} from '@remly/tcp-client';
import {TCPServer} from '../../server';

ConnectivitySuite.run('TCP', async () => {
  const app = new Application();
  const port = await getPort();
  const server = new TCPServer(app, {port});
  await server.start();

  const connection = app.once('connect');
  const clientSocket = TCPClient.connect(port);
  const serverSocket = await connection;
  const close = async () => {
    await server.stop();
  };
  return {app, serverSocket, clientSocket, close};
});
