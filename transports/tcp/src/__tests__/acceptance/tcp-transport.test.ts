import * as net from 'net';
import {AddressInfo} from 'net';
import {ClientSocket, ServerSocket} from '@drpc/core';
import {TCPTransport} from '../../transport';

describe('TCPTransport', function () {
  it('connect', async function () {
    const server = net.createServer(socket => {
      new ServerSocket(new TCPTransport(socket));
    });
    server.listen();
    const socket = net.connect((server.address() as AddressInfo).port);
    const client = new ClientSocket().attach(new TCPTransport(socket));
    await client.once('connected');
    await client.close();
    server.close();
  });
});
