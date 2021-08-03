import {expect, sinon} from '@loopback/testlab';
import delay from 'delay';
import {ClientSocket, ServerSocket} from '../../sockets';
import {givenSocketPair, onceConnected} from '../support';

describe('RPC', function () {
  describe('call', function () {
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
      serverSocket.invoke = () => delay(serverSocket.requestTimeout + 2000);
      const result = clientSocket.call('echo', 'hello');
      await onceConnected(serverSocket, clientSocket);
      clock.tick(serverSocket.requestTimeout + 1000);
      await expect(result).rejectedWith(/Request timed out/);
    });
  });

  describe('subscribe and signal', function () {
    let serverSocket: ServerSocket;
    let clientSocket: ClientSocket;

    beforeEach(() => {
      [serverSocket, clientSocket] = givenSocketPair('test');
    });

    afterEach(async () => {
      await serverSocket.close();
      await clientSocket.close();
    });

    it('should work', async () => {
      const message = {from: 'foo', to: 'bar', content: 'hello world'};
      const result = new Promise(resolve => clientSocket.subscribe('message', resolve));
      await serverSocket.signal('message', message);
      expect(await result).eql(message);
    });
  });
});
