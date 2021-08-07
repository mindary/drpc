import {CloseFn, PrepareFn} from './types';
import {Application} from '@remly/server';
import {ClientSocket, ServerSocket, Socket} from '@remly/core';
import {expect} from '@loopback/testlab';

export namespace ConnectivitySuite {
  export function run(name: string, prepare: PrepareFn) {
    describe(`${name} - TestSuite Connectivity`, () => {
      let app: Application;
      let serverSocket: ServerSocket;
      let clientSocket: ClientSocket;
      let close: CloseFn;

      beforeEach(async () => {
        ({app, serverSocket, clientSocket, close} = await prepare());
      });

      afterEach(async () => {
        await close();
      });

      describe('close by server side', function () {
        it('close by server socket', async () => {
          await assertCloseBy(serverSocket, clientSocket);
        });
      });

      describe('close by client side', function () {
        it('close by client socket', async () => {
          await assertCloseBy(clientSocket, serverSocket);
        });
      });

      describe('net address', function () {
        it('should have address info if transport has socket', function () {
          const serverTransport = serverSocket.transport;
          const clientTransport = clientSocket.transport;
          if (!serverTransport.socket || !clientTransport.socket) {
            // eslint-disable-next-line @typescript-eslint/no-invalid-this
            return this.skip();
          }
          expect(serverTransport.address.localAddress).ok();
          expect(serverTransport.address.remoteAddress).ok();

          expect(clientTransport.address.localAddress).ok();
          expect(clientTransport.address.remoteAddress).ok();

          expect(serverTransport.address.remotePort).ok();
          expect(serverTransport.address.remotePort).equal(clientTransport.address.localPort);

          expect(clientTransport.address.remotePort).ok();
          expect(clientTransport.address.remotePort).equal(serverTransport.address.localPort);
        });
      });
    });

    async function assertCloseBy(activeSocket: Socket, passiveSocket: Socket) {
      expect(passiveSocket.isOpen()).true();
      expect(activeSocket.isOpen()).true();
      await activeSocket.close();
      await passiveSocket.once('close');
      expect(activeSocket.isOpen()).false();
      expect(passiveSocket.isOpen()).false();
    }
  }
}
