import {AddressInfo} from 'net';
import {Application} from '@remly/server';
import {ConnectivitySuite} from '@remly/testsuite';
import {TCPClient} from '@remly/tcp-client';
import {TCPServer} from '../../server';

ConnectivitySuite.run('TCP', async () => {
  const app = new Application();
  const server = new TCPServer(app, {port: 0});
  await server.start();

  const connection = app.once('connection');
  const clientSocket = TCPClient.connect((server.address as AddressInfo).port);
  const serverSocket = await connection;
  const close = async () => {
    await server.stop();
  };
  return {app, serverSocket, clientSocket, close};
});
