import {expect, sinon} from '@loopback/testlab';
import delay from 'delay';
import {ClientSocket, ServerSocket} from '../../sockets';
import {OnIncoming} from '../..';
import {givenSocketPair} from '../support';
import {Monster} from '../fixtures/monster.def';

describe('Core - RPC', function () {
  let clock: sinon.SinonFakeTimers;
  let serverSocket: ServerSocket;
  let clientSocket: ClientSocket;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    [serverSocket, clientSocket] = givenSocketPair('test');
  });

  afterEach(async () => {
    await clientSocket.close();
    await serverSocket.close();
    clock.restore();
  });

  describe(`call`, function () {
    it('call and return with ack', async () => {
      serverSocket.onincoming = request => request.message.payload;
      const result = await clientSocket.call('echo', 'hello');
      expect(result).eql('hello');
    });

    it('call and throw an error', async () => {
      serverSocket.onincoming = () => {
        throw new Error('invalid args');
      };
      await expect(clientSocket.call('echo', 'hello')).rejectedWith('invalid args');
    });

    it('calling timeout', async () => {
      serverSocket.onincoming = async () => {
        await delay(serverSocket.requestTimeout * 3 * 1000);
      };
      const result = clientSocket.call('echo', 'hello');
      await clock.tickAsync(serverSocket.requestTimeout * 2 * 1000);
      await expect(result).rejectedWith(/Request timed out/);
    });
  });

  describe(`subscribe and publish`, function () {
    it('subscribe', async () => {
      const message = {from: 'foo', to: 'bar', content: 'hello world'};
      const result = clientSocket.once('message');
      await serverSocket.emit('message', message);
      expect(await result).eql(message);
    });

    it('subscribeAny', async () => {
      const message = {from: 'foo', to: 'bar', content: 'hello world'};
      const result = new Promise(resolve => clientSocket.onAny((event, data) => resolve({event, data})));
      await serverSocket.emit('message', message);
      expect(await result).eql({event: 'message', data: message});
    });
  });

  describe('service', function () {
    const Invoker: OnIncoming = (request, next) => {
      if (request.message.name === 'monster.add') {
        return request.message.payload[0] + request.message.payload[1];
      }
      return next();
    };

    it('invoke successfully', async () => {
      serverSocket.onincoming = Invoker;
      const monster = clientSocket.service<Monster>(Monster.namespace);
      const result = await monster.call('add', [1, 2]);
      expect(result).eql(3);
    });

    it('invoke fail with unknown method', async () => {
      serverSocket.onincoming = Invoker;
      const monster = clientSocket.service<Monster>(Monster.namespace);
      const result = monster.call('empty');
      await expect(result).rejectedWith(/Method not found/);
    });
  });
});
