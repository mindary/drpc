import {expect, sinon} from '@loopback/testlab';
import delay from 'delay';
import {JsonSerializer} from '@remly/serializer';
import {MsgpackSerializer} from '@remly/serializer-msgpack';
import {ClientSocket, OnCall, ServerSocket} from '../../sockets';
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
          serverSocket.oncall = context => context.end(context.params);
          const result = await clientSocket.remote.call('echo', 'hello');
          expect(result).eql('hello');
        });

        it('call and throw an error', async () => {
          serverSocket.oncall = () => {
            throw new Error('invalid params');
          };
          await expect(clientSocket.remote.call('echo', 'hello')).rejectedWith('invalid params');
        });

        it('calling timeout', async () => {
          serverSocket.oncall = async context => {
            await delay(serverSocket.requestTimeout * 3);
            await context.end();
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
          await serverSocket.remote.emit('message', message);
          expect(await result).eql(message);
        });
        it('subscribeAny', async () => {
          const message = {from: 'foo', to: 'bar', content: 'hello world'};
          const result = new Promise(resolve => clientSocket.remote.onAny((event, data) => resolve({event, data})));
          await serverSocket.remote.emit('message', message);
          expect(await result).eql({event: 'message', data: message});
        });
      });

      describe('service', function () {
        const Invoker: OnCall = context => {
          if (context.name === 'monster.add') {
            return context.end(context.params[0] + context.params[1]);
          }
          throw new Error('Unknown method ' + context.name);
        };

        it('invoke successfully', async () => {
          serverSocket.oncall = Invoker;
          const monster = clientSocket.remote.service(Monster);
          const result = await monster.add(1, 2);
          expect(result).eql(3);
        });

        it('invoke fail with unknown method', async () => {
          serverSocket.oncall = Invoker;
          const monster = clientSocket.remote.service(Monster);
          const result = monster.empty();
          await expect(result).rejectedWith(/Unknown method/);
        });
      });
    });
  }
});
