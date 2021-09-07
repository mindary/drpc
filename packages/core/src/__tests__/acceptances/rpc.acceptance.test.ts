import {expect, sinon} from '@loopback/testlab';
import delay from 'delay';
import {ClientSocket, ServerSocket} from '../../sockets';
import {OnIncoming} from '../..';
import {givenSocketPair} from '../support';
import {Monster} from '../fixtures/monster.definition';

describe('Core - RPC', function () {
  let clock: sinon.SinonFakeTimers;
  let serverSocket: ServerSocket;
  let clientSocket: ClientSocket;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    [serverSocket, clientSocket] = givenSocketPair('test');
  });

  afterEach(async () => {
    await serverSocket.close();
    await clientSocket.close();
    clock.restore();
  });

  describe(`call`, function () {
    it('call and return with ack', async () => {
      serverSocket.onincoming = request => request.params;
      const result = await clientSocket.remote.call('echo', 'hello');
      expect(result).eql('hello');
    });

    it('call and throw an error', async () => {
      serverSocket.onincoming = () => {
        throw new Error('invalid args');
      };
      await expect(clientSocket.remote.call('echo', 'hello')).rejectedWith('invalid args');
    });

    it('calling timeout', async () => {
      serverSocket.onincoming = async () => {
        await delay(serverSocket.requestTimeout * 3 * 1000);
      };
      const result = clientSocket.remote.call('echo', 'hello');
      await clock.tickAsync(serverSocket.requestTimeout * 2 * 1000);
      await expect(result).rejectedWith(/Request timed out/);
    });
  });

  describe(`subscribe and signal`, function () {
    it('subscribe', async () => {
      const message = {from: 'foo', to: 'bar', content: 'hello world'};
      const result = new Promise(resolve => clientSocket.remote.on('message', resolve));
      await serverSocket.remote.signal('message', message);
      expect(await result).eql(message);
    });
    it('subscribeAny', async () => {
      const message = {from: 'foo', to: 'bar', content: 'hello world'};
      const result = new Promise(resolve => clientSocket.remote.onAny((event, data) => resolve({event, data})));
      await serverSocket.remote.signal('message', message);
      expect(await result).eql({event: 'message', data: message});
    });
  });

  describe('service', function () {
    const Invoker: OnIncoming = (request, next) => {
      if (request.name === 'monster.add') {
        return request.params[0] + request.params[1];
      }
      return next();
    };

    it('invoke successfully', async () => {
      serverSocket.onincoming = Invoker;
      const monster = clientSocket.remote.service(Monster);
      const result = await monster.add(1, 2);
      expect(result).eql(3);
    });

    it('invoke fail with unknown method', async () => {
      serverSocket.onincoming = Invoker;
      const monster = clientSocket.remote.service(Monster);
      const result = monster.empty();
      await expect(result).rejectedWith(/Method not found/);
    });
  });
});
