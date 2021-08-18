import {expect, sinon} from '@loopback/testlab';
import delay from 'delay';
import {JsonSerializer} from '@remly/serializer';
import {MsgpackSerializer} from '@remly/serializer-msgpack';
import {ClientSocket, OnRequest, ServerSocket} from '../../sockets';
import {givenSocketPair} from '../support';
import {Monster} from '../fixtures/monster.definition';

const serializers = [new JsonSerializer(), new MsgpackSerializer()];

describe('Core - RPC', function () {
  for (const serializer of serializers) {
    const serializerName = serializer.constructor.name;
    const options = {server: {serializer}, client: {serializer}};

    describe(`with ${serializerName}`, () => {
      let clock: sinon.SinonFakeTimers;
      let serverSocket: ServerSocket;
      let clientSocket: ClientSocket;

      beforeEach(() => {
        clock = sinon.useFakeTimers();
        [serverSocket, clientSocket] = givenSocketPair('test', options);
      });

      afterEach(async () => {
        await serverSocket.close();
        await clientSocket.close();
        clock.restore();
      });

      it('should have correct serializer', function () {
        expect(serverSocket.serializer).equal(serializer);
        expect(clientSocket.serializer).equal(serializer);
      });

      describe(`call`, function () {
        it('call and return with ack', async () => {
          serverSocket.onrequest = request => request.params;
          const result = await clientSocket.remote.call('echo', 'hello');
          expect(result).eql('hello');
        });

        it('call and throw an error', async () => {
          serverSocket.onrequest = () => {
            throw new Error('invalid args');
          };
          await expect(clientSocket.remote.call('echo', 'hello')).rejectedWith('invalid args');
        });

        it('calling timeout', async () => {
          serverSocket.onrequest = async () => {
            await delay(serverSocket.requestTimeout * 3);
          };
          const result = clientSocket.remote.call('echo', 'hello');
          await clock.tickAsync(serverSocket.requestTimeout * 2);
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
        const Invoker: OnRequest = request => {
          if (request.name === 'monster.add') {
            return request.params[0] + request.params[1];
          }
          throw new Error('Unknown method ' + request.name);
        };

        it('invoke successfully', async () => {
          serverSocket.onrequest = Invoker;
          const monster = clientSocket.remote.service(Monster);
          const result = await monster.add(1, 2);
          expect(result).eql(3);
        });

        it('invoke fail with unknown method', async () => {
          serverSocket.onrequest = Invoker;
          const monster = clientSocket.remote.service(Monster);
          const result = monster.empty();
          await expect(result).rejectedWith(/Unknown method/);
        });
      });
    });
  }
});
