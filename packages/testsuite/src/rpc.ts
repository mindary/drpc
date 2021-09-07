import {assert} from 'ts-essentials';
import {expect} from '@loopback/testlab';
import {DefaultRegistry, Socket, ValueOrPromise} from '@drpc/core';
import {Application, ApplicationOptions} from '@drpc/server';
import {Client} from '@drpc/client';
import {Monster, monster} from '@drpc/testlab';
import {PrepareFn} from './types';

export namespace RpcSuite {
  export type Side = 'both' | 'server' | 'client';

  export function givenApplication(options?: ApplicationOptions): Application {
    const app = new Application(options);

    const registry = new DefaultRegistry();
    registry.register(Monster.name, monster);
    app.onincoming = async request => request.isCall() && registry.invoke(request.message);

    app.on('connection', setupSocket);
    return app;
  }

  export function setupClient(client: Client) {
    const registry = new DefaultRegistry();
    registry.register(Monster.name, monster);
    client.onincoming = async request => request.isCall() && registry.invoke(request.message);

    setupSocket(client.socket);
  }

  function setupSocket(socket: Socket) {
    socket.remote.on('echo', (msg: string) => socket.remote.signal('echo-reply', 'Hello ' + msg));
  }

  export function run(prepare: PrepareFn, side: Side = 'both') {
    describe(`TestSuite Rpc`, function () {
      let app: Application;
      let serverSocket: Socket | undefined;
      let clientSocket: Socket | undefined;
      let close: () => ValueOrPromise<void>;

      before(async () => {
        ({app, serverSocket, clientSocket, close} = await prepare());
      });

      after(async () => {
        await close();
      });

      if (side === 'both' || side === 'server') {
        describe('server -> client', () => runTests(() => serverSocket));
      }
      if (side === 'both' || side === 'client') {
        describe('client -> server', () => runTests(() => clientSocket));
      }

      function runTests(getSocket: () => Socket | undefined) {
        describe('call', function () {
          it('call a success-method', async () => {
            const socket = getSocket();
            assert(socket);
            const service = socket.remote.service(Monster);
            const result = await service.add(1, 2);
            expect(result).equal(3);
          });

          it('call a error-method', async () => {
            const socket = getSocket();
            assert(socket);
            const service = socket.remote.service(Monster);
            await expect(service.error()).rejectedWith(/An error message/);
          });
        });

        describe('remote on and signal', function () {
          it('remote on', async () => {
            const socket = getSocket();
            assert(socket);
            const reply = new Promise(resolve => socket.remote.on('echo-reply', resolve));
            await socket.remote.signal('echo', 'Tom');
            expect(await reply).deepEqual('Hello Tom');
          });
        });
      }
    });
  }
}
