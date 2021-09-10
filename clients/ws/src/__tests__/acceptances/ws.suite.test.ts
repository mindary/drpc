import {fromCallback} from 'a-callback';
import {AddressInfo} from 'net';
import {RpcSuite} from '@drpc/testsuite';
import http from 'http';
import WS from 'ws';
import {connect} from '@drpc/client';
import {ws} from '@drpc/server';
import * as channel from '../..';

describe('WebSocket - Suite', function () {
  RpcSuite.run(async () => {
    const app = RpcSuite.givenApplication();
    const server = http.createServer();
    const wss = new WS.Server({server});
    wss.on('connection', ws(app.handle));
    server.listen(0);

    const connection = app.once('connection');
    const client = await connect('ws://localhost', {
      port: (server.address() as AddressInfo).port,
      channel,
    });
    RpcSuite.setupClient(client);
    const clientSocket = client.socket;
    const serverSocket = await connection;

    const close = async () => {
      await client.close();
      await fromCallback(cb => server.close(cb));
    };
    return {app, serverSocket, clientSocket, close};
  });
});
