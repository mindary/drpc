import {Monster} from '@drpc/testlab';
import * as net from 'net';
import {expect, sinon} from '@loopback/testlab';
import {givenApplication, setupServer} from '../support';
import {ApplicationWithRegistry} from '../fixtures/app';
import * as tcp from '../fixtures/tcp';
import * as drpc from '../..';
import {ClientOptions} from './../..';
import {noop} from 'ts-essentials';

describe('Client', function () {
  const config: Partial<ClientOptions> = {protocol: 'tcp', connector: tcp};
  let app: ApplicationWithRegistry;
  let server: net.Server;
  let port: number;

  before(async () => {
    app = givenApplication();
    [server, port] = await setupServer(app);
    config.port = port;
  });

  after(function (done) {
    server.close(done);
  });

  clientTests(config);
});

function clientTests(config?: Partial<ClientOptions>) {
  function connect(options?: ClientOptions) {
    return drpc.connect({...config, ...options});
  }

  let clock: sinon.SinonFakeTimers;

  before(() => {
    clock = sinon.useFakeTimers();
  });

  after(() => {
    clock.reset();
    clock.restore();
  });

  describe('connect multiple times', function () {
    it('should restore connected state after reconnecting', async function () {
      const client = await connect({
        connector: await import('../fixtures/tcp'),
      });

      const service = client.service<Monster>(Monster.namespace);

      await client.once('connected');
      expect(await service.call('add', [1, 2])).equal(3);
      await client.close();

      await expect(service.call('add', [1, 2])).rejectedWith(/close/);

      await client.connect();
      await client.once('connected');
      expect(await service.call('add', [1, 2])).equal(3);
      await client.close();
    });
  });

  describe('handling offline states', function () {
    it('should emit offline event once when the client transitions from connected states to disconnected ones', async () => {
      const client = await connect({reconnectionDelay: 20});

      await client.once('connected');
      client.transport.close().catch(noop);

      await client.once('offline');
      await client.close();
    });

    it('should emit offline event once when the client (at first) can NOT connect to servers', async () => {
      let offlineTimes = 0;

      // fake a port
      const client = await connect({reconnectionDelay: 20, port: 4557});
      client.on('error', noop);
      client.on('offline', () => offlineTimes++);

      await client.once('close');
      await clock.tickAsync(client.options.reconnectionDelay + 1000);

      expect(offlineTimes).equal(1);

      await client.close();
    });
  });

  describe('auto reconnect', function () {
    it('should mark the client disconnecting if #end called', async () => {
      const client = await connect();
      await client.once('connected');
      client.close().catch(noop);
      expect(client.isClosing()).is.true();
    });

    it('should reconnect after transport close', async () => {
      const client = await connect();
      await client.once('connected');
      expect(client.isConnected()).is.true();

      client.transport.close().catch(noop);

      // speed up reconnecting
      await clock.tickAsync(client.options.reconnectionDelay + 1000);

      await client.once('connected');
      expect(client.isConnected()).is.true();
      await client.close();
    });

    it('should emit "reconnect" when reconnecting', async () => {
      const client = await connect();
      await client.once('connected');
      expect(client.isConnected()).is.true();

      let reconnects = 0;
      client.on('reconnect', () => reconnects++);
      client.transport.close().catch(noop);
      // speed up reconnecting
      await clock.tickAsync(client.options.reconnectionDelay + 1000);
      await client.once('connected');

      expect(reconnects).equal(1);

      await client.close();
    });

    it('should not reconnect if it was closed by the user', async () => {
      const client = await connect();
      await client.once('connected');

      let reconnects = 0;
      client.on('reconnect', () => reconnects++);
      await client.close();

      await clock.tickAsync(client.options.reconnectionDelay + 1000);
      expect(client.isConnected()).is.false();
      expect(reconnects).equal(0);
    });

    describe('custom reconnect delay', function () {
      [200, 2000, 4000].forEach(reconnectionDelay => {
        it(`should allow specification of a reconnect period (${reconnectionDelay}ms)`, async () => {
          // give the connection a 200 ms slush window
          const reconnectSlushTime = 200;

          const client = await connect({reconnectionDelay, reconnectionDelayMax: reconnectionDelay});
          const start = Date.now();
          await client.once('connected');

          client.transport.close().catch(noop);
          await clock.tickAsync(reconnectionDelay + 10);
          await client.once('connected');
          const end = Date.now();
          await client.close();

          const reconnectElapse = end - start;
          // give the connection a 200 ms slush window
          expect(reconnectElapse).greaterThanOrEqual(reconnectionDelay - reconnectSlushTime);
          expect(reconnectElapse).lessThanOrEqual(reconnectionDelay + reconnectSlushTime);
        });
      });
    });

    it('reconnect delay should increase every time', async () => {
      let reconnects = 0;
      let increasingDelay = true;
      let startTime: number;
      let prevDelay = 0;
      let reconnectFailed = false;

      const client = await connect({
        port: 4557,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 100,
        randomizationFactor: 0.2,
      });

      client.on('error', () => {
        startTime = new Date().getTime();
      });

      client.on('reconnect', () => {
        reconnects++;
        const currentTime = new Date().getTime();
        const delay = currentTime - startTime;
        if (delay <= prevDelay) {
          increasingDelay = false;
        }
        prevDelay = delay;
      });

      client.on('reconnect_failed', () => (reconnectFailed = true));

      while (!reconnectFailed) {
        await clock.tickAsync(1000);
      }

      expect(reconnectFailed).is.true();
      expect(reconnects).to.equal(3);
      expect(increasingDelay).to.be.ok();
      await client.close();
    });

    it('should always cleanup successfully on reconnection', async () => {
      const client = await connect({host: 'this_hostname_should_not_exist', connectTimeout: 0, reconnectionDelay: 1});
      client.on('error', noop);
      const promise = new Promise(resolve => setTimeout(() => resolve(client.close()), 50));
      await clock.tickAsync(50);
      await promise;
    });
  });
}
