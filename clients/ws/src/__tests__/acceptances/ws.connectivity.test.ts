import {fromCallback} from 'a-callback';
import {AddressInfo} from 'net';
import * as http from 'http';
import WS from 'ws';
import {Application, ws} from '@drpc/server';
import {ConnectivitySuite} from '@drpc/testsuite';
import {connect} from '@drpc/client';
import * as channel from '../..';

ConnectivitySuite.run('WebSocket', async () => {
  const app = new Application();
  const server = http.createServer();
  const wss = new WS.Server({server});
  wss.on('connection', ws(app.handle));
  server.listen(0);

  const connection = app.once('connection');
  const client = await connect('ws://localhost', {
    port: (server.address() as AddressInfo).port,
    channel,
  });
  const clientSocket = client.socket;
  const serverSocket = await connection;
  const close = async () => {
    await client.close();
    await fromCallback(cb => server.close(cb));
  };
  return {app, serverSocket, clientSocket, close};
});
