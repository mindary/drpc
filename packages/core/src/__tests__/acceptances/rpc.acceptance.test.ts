import {expect, sinon} from '@loopback/testlab';
import delay from 'delay';
import {MsgpackSerializer} from '@remly/serializer-msgpack';
import {ClientSocket, ServerSocket} from '../../sockets';
import {givenSocketPair} from '../support';

const serializers = [
  // new JsonSerializer(),
  new MsgpackSerializer(),
];

describe('RCore - PC', function() {
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

      it('should have correct serializer', function() {
        expect(serverSocket.serializer).equal(serializer);
        expect(clientSocket.serializer).equal(serializer);
      });

      describe(`call`, function() {
        it('call and return with ack', async () => {
          serverSocket.invoke = (name, params) => params;
          const result = await clientSocket.call('echo', 'hello');
          expect(result).eql('hello');
        });

        it('call and throw an error', async () => {
          serverSocket.invoke = () => {
            throw new Error('invalid params');
          };
          await expect(clientSocket.call('echo', 'hello')).rejectedWith('invalid params');
        });

        it('calling timeout', async () => {
          serverSocket.invoke = () => delay(serverSocket.requestTimeout * 3);
          const result = clientSocket.call('echo', 'hello');
          await clock.tickAsync(serverSocket.requestTimeout * 2);
          await expect(result).rejectedWith(/Request timed out/);
        });
      });

      describe(`subscribe and signal`, function() {
        it('should work', async () => {
          const message = {from: 'foo', to: 'bar', content: 'hello world'};
          const result = new Promise(resolve => clientSocket.subscribe('message', resolve));
          await serverSocket.signal('message', message);
          expect(await result).eql(message);
        });
      });
    });
  }
});
