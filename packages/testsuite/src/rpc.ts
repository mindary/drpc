import {assert} from 'ts-essentials';
import {expect} from '@loopback/testlab';
import {Socket, ValueOrPromise} from '@drpc/core';
import {Application, ApplicationOptions} from '@drpc/server';
import {Client} from '@drpc/client';
import {Monster, monster} from '@drpc/testlab';
import {DefaultRegistry} from '@drpc/registry';
import {PrepareFn} from './types';
import {RemoteService} from '@drpc/core/dist/remote';

export namespace RpcSuite {
  export type Side = 'both' | 'server' | 'client';

  export function givenApplication(options?: ApplicationOptions): Application {
    const app = new Application(options);

    const registry = new DefaultRegistry();
    registry.register(Monster.namespace, monster);
    app.onincoming = async carrier => carrier.isCall() && registry.invoke(carrier.req as any);

    app.on('connection', setupSocket);
    return app;
  }

  export function setupClient(client: Client) {
    const registry = new DefaultRegistry();
    registry.register(Monster.namespace, monster);
    client.onincoming = async carrier => carrier.isCall() && registry.invoke(carrier.req as any);

    setupSocket(client);
  }

  function setupSocket(socket: Socket) {
    socket.on('echo', (msg: string) => socket.emit('echo-reply', 'Hello ' + msg));
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
          let socket: Socket;
          let service: RemoteService<Monster>;

          before(() => {
            socket = getSocket() as Socket;
            assert(socket);
            service = socket.service<Monster>(Monster.namespace);
          });

          it('calls a success-method', async () => {
            const result = await service.call('add', [1, 2]);
            expect(result).equal(3);
          });

          it('calls a error-method', async () => {
            await expect(service.call('error')).rejectedWith(/An error message/);
          });

          it('calls a slow method', async () => {
            const start = Date.now();
            expect(await service.call('addSlow', [1, 2, true])).equal(3);
            const elapse = Date.now() - start;
            expect(elapse).greaterThan(15);
            expect(elapse).lessThan(25);
          });

          it('calls sleep', async () => {
            const start = Date.now();
            expect(await service.call('sleep', [10])).equal(10);
            const elapse = Date.now() - start;
            expect(elapse).greaterThanOrEqual(10);
            expect(elapse).lessThan(20);
          });

          it('calls with no args', async () => {
            expect(await service.call('noArgs')).equal(true);
          });

          it('calls with custom exception', async () => {
            await expect(service.call('exception')).rejectedWith(/An exception message/);
          });
        });

        describe('event', function () {
          it('echo with event', async () => {
            const socket = getSocket();
            assert(socket);
            const reply = new Promise(resolve => socket.on('echo-reply', resolve));
            await socket.emit('echo', 'Tom');
            expect(await reply).deepEqual('Hello Tom');
          });
        });
      }
    });
  }
}
