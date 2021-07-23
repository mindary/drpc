import {expect} from '@loopback/testlab';
import aDefer from 'a-defer';
import {Connection} from '@remly/core';
import {Server} from '@remly/server';
import {ConnProvider} from './types';
import {monster, MonsterService} from './mocks';

export namespace CommonTestSuite {
  export function setupConnection(conn: Connection, notRegister?: boolean) {
    if (!notRegister) {
      conn.registry.register(monster);
    }
    conn.subscribe('echo', async (msg: string) => {
      await conn.signal('echo-reply', 'Hello ' + msg);
    });
  }

  export function setupServer(server: Server<any>) {
    server.register(monster);
    Object.values(server.connections).forEach(conn => setupConnection(conn, true));
    server.on('connection', conn => setupConnection(conn, true));
    server.on('error', (err: any) => console.log(err));
  }

  export function suite<C extends Connection = Connection>(provider: ConnProvider) {
    describe('RPC common operations', () => {
      let conn: Connection;

      beforeEach(async () => {
        conn = await provider();
      });

      afterEach(async () => {
        await conn.end();
      });

      it('should be able to call a success-method on the server ', async () => {
        const service = conn.service<MonsterService>();
        const result = await service.call('add', [1, 2]);
        expect(result).equal(3);
      });

      it('should be able to call an error-method on the server', async () => {
        const service = conn.service<MonsterService>();
        await expect(service.call('error')).rejectedWith(/An error message/);
      });

      it('should be able to subscribe event', async () => {
        const done = aDefer();
        const results: any[] = [];
        conn.subscribe('echo-reply', (msg: string) => {
          results.push(msg);
          done.resolve();
        });
        await conn.signal('echo', 'Tom');
        await done;
        expect(results).deepEqual(['Hello Tom']);
      });
    });
  }
}
