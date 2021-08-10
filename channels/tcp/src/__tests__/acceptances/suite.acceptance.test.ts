import getPort from 'get-port';
import {RPCSuite} from '@remly/testsuite';
import {TCPClient} from '@remly/tcp-client';
import {TCPServer} from '../../server';

RPCSuite.run('TCP', async () => {
  const port = await getPort();
  const app = RPCSuite.givenApplication();
  const server = new TCPServer(app, {port});
  await server.start();

  const connection = app.once('connect');
  const clientSocket = TCPClient.connect(port);
  RPCSuite.setupClient(clientSocket);
  const serverSocket = await connection;

  const close = async () => {
    await server.stop();
  };
  return {app, serverSocket, clientSocket, close};
});
