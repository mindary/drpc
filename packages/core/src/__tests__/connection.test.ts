import {expect} from '@loopback/testlab';
import delay from 'delay';
import {PickProperties} from 'ts-essentials';
import {ErrorCode, ErrorMessages} from '../error-code';
import {RemError, TimeoutError} from '../error';
import {monster, Monster} from './mocks/monster';
import {MockServer} from './mocks/mock.server';
import {MockClient} from './mocks/mock.client';
import {peace} from './support';

describe('connection', function() {
  describe('call', function() {
    let server: MockServer;
    let client: MockClient;

    beforeEach(async () => {
      server = new MockServer();
      client = await MockClient.connect(server);
    });

    afterEach(async () => {
      await client.end();
    });

    it('should work in sync', async function() {
      server.register('action', () => 10);
      const result = await client.call('action');
      expect(result).equal(10);
    });

    it('should work in async', async function() {
      server.register('action', async () => 10);
      const result = await client.call('action');
      expect(result).equal(10);
    });

    it('should transfer exception', async function() {
      server.register('action', async () => {
        await delay(15);
        throw new RemError({message: 'Boom', data: 10});
      });
      const [, err] = await peace(() => client.call('action'));
      expect(err).containDeep({
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Boom',
        data: 10,
      });
    });

    it('should transfer rejection', async function() {
      server.register('action', async () => {
        await delay(15);
        return new Promise((_, reject) => reject(10));
      });
      const [, err] = await peace(() => client.call('action'));
      expect(err).containDeep({
        code: ErrorCode.INTERNAL_ERROR,
        message: ErrorMessages[ErrorCode.INTERNAL_ERROR],
        data: 10,
      });
    });

    it('should throw unimplemented error', async function() {
      const [, err] = await peace(() => client.call('action'));
      expect(err).ok();
      expect(err.code).equal(ErrorCode.UNIMPLEMENTED);
    });
  });

  describe('job timeout', function() {
    describe('jobTimout', function() {
      it('should throw timeout error if call timout', async function() {
        const server = new MockServer();
        server.register('action', async () => {
          await delay(300);
          return 10;
        });

        const client = await MockClient.connect(server, {
          interval: 50,
          requestTimeout: 200,
        });

        const [, err] = await peace(() => client.call('action'));
        expect(err).instanceOf(TimeoutError);

        await client.end();
      });
    });

    describe('call with timeout parameter', function() {
      it('should throw timeout error if call timout', async function() {
        const server = new MockServer();
        server.register('action', async () => {
          await delay(300);
          return 10;
        });

        const client = await MockClient.connect(server, {
          interval: 50,
        });

        const [, err] = await peace(() => client.call('action', undefined, 200));
        expect(err).instanceOf(TimeoutError);

        await client.end();
      });
    });
  });

  describe('parallel calling', function() {
    it('should work for parallel calling', async function() {
      const server = new MockServer();
      server.register('action1', async (v: number) => {
        return v;
      });
      server.register('action2', async (v: number) => {
        await delay(30);
        return v * 2;
      });

      const client = await MockClient.connect(server);

      const results = await Promise.all([client.call('action1', 10), client.call('action2', 20)]);
      expect(results).deepEqual([10, 40]);

      await client.end();
    });
  });

  describe('subscribe and signal', function() {
    let server: MockServer;
    let client: MockClient;

    beforeEach(async () => {
      server = new MockServer();
      client = await MockClient.connect(server);
    });

    afterEach(async () => {
      await client.end();
    });

    it('should receive event', async function() {
      const connection = client.target;
      let x = -1;
      client.subscribe('action', (value: number) => (x = value));
      await connection.signal('action', 5);
      await delay(100);
      expect(x).equal(5);
    });

    it('should work for parallel firing', async function() {
      const connection = client.target;
      let x = -1;
      let y = -1;
      client.subscribe('setx', (value: number) => (x = value));
      client.subscribe('sety', (value: number) => (y = value));

      await connection.signal('setx', 5);
      await connection.signal('sety', 6);

      await delay(100);
      expect(x).equal(5);
      expect(y).equal(6);
    });

    it('should bind multiple listeners to one event', async function() {
      const connection = client.target;
      let x = -1;
      let y = -1;
      client.subscribe('action', (value: number) => (x = value));
      client.subscribe('action', (value: number) => (y = value));
      await connection.signal('action', 5);
      await delay(100);
      expect(x).equal(5);
      expect(y).equal(5);
    });

    it('should support unsubscribe', async function() {
      const connection = client.target;
      let x = -1;
      const cancel = client.subscribe('action', (value: number) => (x = value));
      cancel();
      await connection.signal('action', 5);
      await delay(100);
      expect(x).equal(-1);
    });
  });

  describe('server service', function() {
    let server: MockServer;
    let client: MockClient;

    beforeEach(async () => {
      server = new MockServer();
      client = await MockClient.connect(server);
    });

    afterEach(async () => {
      await client.end();
    });

    it('should call with typed parameters', async function() {
      type MonsterService = PickProperties<Monster, Function>;
      server.register(monster);
      const service = client.service<MonsterService>();
      const result = await service.call('add', [1, 2]);
      expect(result).equal(3);
    });
  });

  describe('client service', function() {
    let server: MockServer;
    let client: MockClient;

    beforeEach(async () => {
      server = new MockServer();
      client = await MockClient.connect(server);
    });

    afterEach(async () => {
      await client.end();
    });

    it('server connection use server registry', async function() {
      const [connection] = Object.values(server.connections);
      expect(server.registry).equal(connection.registry);
    });

    it('can register client service', function() {
      expect(client.registry).ok();
      expect(Object.keys(client.registry!.methods)).empty();
      client.register(monster);
      expect(Object.keys(client.registry!.methods)).not.empty();
    });

    it('can not register client service without registry', function() {
      client.registry = undefined;
      expect(() => client.register(monster)).throw(/register is not supported/);
    });

    it('call client service', async () => {
      type MonsterService = PickProperties<Monster, Function>;
      client.register(monster);
      const [connection] = Object.values(server.connections);
      const service = connection.service<MonsterService>();
      const result = await service.call('add', [1, 2]);
      expect(result).equal(3);
    });

  });
});
