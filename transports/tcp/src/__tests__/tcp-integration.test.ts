import {expect} from '@tib/testlab';
import {Defer} from '@tib/defer';
import delay from 'delay';
import net from 'net';
import findAvailablePort from 'get-port';
import {syncl} from '@remly/core';
import {TCPServer} from '../server';
import {TCPClient} from '../client';

describe('tcp-integration', function () {
  let server: net.Server;

  beforeEach(() => {
    server = net.createServer();
  });

  afterEach(done => {
    server.close(done);
  });

  it('should work', async () => {
    const done = new Defer();
    const port = await findAvailablePort();

    const fooResult = 'test'; //Buffer.from('test', 'ascii');
    const bazEvent = {bar: 'baz'};
    const errMessage = 'Bad call';

    const expected: any[] = [fooResult, bazEvent, errMessage];
    const results: any[] = [];

    const rpc = new TCPServer().attach(server);

    rpc.register('foo', async data => {
      const result = fooResult;
      await delay(100);
      return result;
    });

    rpc.register('error', async data => {
      throw new Error(errMessage);
    });

    rpc.on('connection', connection => {
      connection.listen('bar', data => {
        // 1: 'baz'
        results.push(data);
      });
    });

    const serverReady = new Defer();
    server.listen(port, () => serverReady.resolve());
    await serverReady;

    const client = TCPClient.connect(port);

    client.on(
      'connect',
      syncl(async () => {
        // 0: Buffer<'test'>
        results.push(await client.call('foo'));
        client.fire('bar', bazEvent);
        try {
          await client.call('error');
        } catch (e) {
          // 2: 'Bad call'
          results.push(e.message);
        }
        done.resolve();
      }, client),
    );

    await done;
    client.end();

    expect(results).deepEqual(expected);
  });
});
