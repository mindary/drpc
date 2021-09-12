import {AddressInfo} from 'net';
import http from 'http';
import WS from 'ws';
import {ClientSocket, ServerSocket} from '@drpc/core';
import {WebSocketTransport, ws} from '../../transport';

describe('TCPTransport', function () {
  it('connect', async function () {
    const server = http.createServer();
    const wss = new WS.Server({server});
    wss.on(
      'connection',
      ws(transport => new ServerSocket(transport)),
    );
    server.listen();

    const wsc = new WS(`ws://localhost:${(server.address() as AddressInfo).port}`);
    const client = new ClientSocket().attach(new WebSocketTransport(wsc));
    await client.once('connected');
    await client.close();
    server.close();
  });
});
