import {expect} from '@loopback/testlab';
import {Socket, ValueOrPromise} from '@remly/core';
import {Application, ApplicationOptions} from '@remly/server';
import {Client} from '@remly/client';
import {monster, MonsterService} from '@remly/testlab';
import {PrepareFn} from './types';
import {assert} from 'ts-essentials';

export namespace RPCSuite {
  export type Side = 'both' | 'server' | 'client';

  export function givenApplication(options?: ApplicationOptions): Application {
    const app = new Application(options);
    app.register(monster);
    app.on('connection', setupSocket);
    return app;
  }

  export function setupClient(client: Client) {
    client.register(monster);
    setupSocket(client);
  }

  function setupSocket(socket: Socket) {
    socket.subscribe('echo', (msg: string) => socket.signal('echo-reply', 'Hello ' + msg));
  }

  export function run(name: string, prepare: PrepareFn, side: Side = 'both') {
    describe(`${name} - TestSuite RPC`, function () {
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
            const service = socket.service<MonsterService>();
            const result = await service.call('add', [1, 2]);
            expect(result).equal(3);
          });

          it('call a error-method', async () => {
            const socket = getSocket();
            assert(socket);
            const service = socket.service<MonsterService>();
            await expect(service.call('error')).rejectedWith(/An error message/);
          });
        });

        describe('subscribe and signal', function () {
          it('subscribe', async () => {
            const socket = getSocket();
            assert(socket);
            const reply = new Promise(resolve => socket.subscribe('echo-reply', resolve));
            await socket.signal('echo', 'Tom');
            expect(await reply).deepEqual('Hello Tom');
          });
        });
      }
    });
  }
}
