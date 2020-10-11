import {expect} from '@tib/testlab';
import {Defer} from '@tib/defer';
import {monster, MonsterService} from './mocks';
import {ClientProvider, ServerAndClientProvider} from './types';
import {Connection} from '@remly/core';
import {Server} from '@remly/server';

export namespace common {
  export function setupConnection(conn: Connection, notRegister?: boolean) {
    if (!notRegister) {
      conn.registry.register(monster);
    }
    conn.listen('echo', async (msg: string) => {
      await conn.signal('echo-reply', 'Hello ' + msg);
    });
  }

  export function setupServer(server: Server<any>) {
    server.register(monster);
    Object.values(server.connections).forEach(conn => setupConnection(conn, true));
    server.on('connection', conn => setupConnection(conn, true));
    server.on('error', (err: any) => console.log(err));
  }

  export function test<C extends Connection = Connection>(provider: ClientProvider) {
    return () => {
      it('should be able to call a success-method on the server ', async () => {
        const client = await provider();
        const service = client.service<MonsterService>();
        const result = await service.call('add', [1, 2]);
        expect(result).equal(3);
      });

      it('should be able to call an error-method on the server', async () => {
        const client = await provider();
        const service = client.service<MonsterService>();
        await expect(service.call('error')).rejectedWith(/An error message/);
      });

      it('should be able to listen event', async () => {
        const client = await provider();
        const done = new Defer();
        const results: any[] = [];
        client.listen('echo-reply', (msg: string) => {
          results.push(msg);
          done.resolve();
        });
        await client.signal('echo', 'Tom');
        await done;
        expect(results).deepEqual(['Hello Tom']);
      });
    };
  }
}
