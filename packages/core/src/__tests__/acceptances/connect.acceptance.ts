import {expect, sinon} from '@loopback/testlab';
import delay from 'delay';
import {givenSocketPair, onceConnected} from '../support';
import {ClientSocket, ServerSocket} from '../../sockets';
import {ConnectTimeoutError} from '../../errors';
import {Packet} from '../../packet';
import {PacketTypeMap} from '../../packet-type';

describe('Connect', function () {
  describe('connect handshake', function () {
    it('should emit correct sequential events', async () => {
      const [serverSocket, clientSocket] = givenSocketPair('test');

      const serverEvents: string[] = [];
      const clientEvents: string[] = [];
      serverSocket.onAny(event => serverEvents.push(event));
      clientSocket.onAny(event => clientEvents.push(event));

      await onceConnected(serverSocket, clientSocket);

      expect(serverEvents).deepEqual(['packet_create', 'open', 'packet', 'heartbeat', 'packet_create', 'connected']);
      expect(clientEvents).deepEqual(['packet', 'heartbeat', 'packet_create', 'packet', 'heartbeat', 'connected']);

      await serverSocket.close();
      await clientSocket.close();
    });

    it('should received correct sequential packets', async () => {
      const [serverSocket, clientSocket] = givenSocketPair('test');

      const serverRecv: Packet[] = [];
      const serverSent: Packet[] = [];
      const clientRecv: Packet[] = [];
      const clientSent: Packet[] = [];

      serverSocket.on('packet', packet => serverRecv.push(packet));
      serverSocket.on('packet_create', packet => serverSent.push(packet));
      clientSocket.on('packet', packet => clientRecv.push(packet));
      clientSocket.on('packet_create', packet => clientSent.push(packet));

      await onceConnected(serverSocket, clientSocket);

      expect(serverSent.map(p => PacketTypeMap[p.type])).deepEqual(['open', 'connect']);
      expect(clientRecv.map(p => PacketTypeMap[p.type])).deepEqual(['open', 'connect']);

      expect(clientSent.map(p => PacketTypeMap[p.type])).deepEqual(['connect']);
      expect(serverRecv.map(p => PacketTypeMap[p.type])).deepEqual(['connect']);

      await serverSocket.close();
      await clientSocket.close();
    });
  });

  describe('handshake with auth', function () {
    let serverSocket: ServerSocket;
    let clientSocket: ClientSocket;

    beforeEach(() => {
      [serverSocket, clientSocket] = givenSocketPair('test');
    });

    afterEach(async () => {
      await serverSocket.close();
      await clientSocket.close();
    });

    it('should allow', async () => {
      const AUTH = {token: 'hello'};
      clientSocket.auth = AUTH;
      serverSocket.connect = ({auth}) => {
        if (auth.token !== AUTH.token) {
          throw new Error('Unauthorized');
        }
      };
      await onceConnected(serverSocket, clientSocket);
    });

    it('should deny', async () => {
      clientSocket.auth = {token: 'hello'};
      serverSocket.connect = () => {
        throw new Error('Unauthorized');
      };
      const error = await clientSocket.once('connect_error');
      expect(error.message).equal('Unauthorized');
    });
  });

  describe('connect timeout', function () {
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

    it('client should throw ConnectTimeoutError for server long time authenticating', async () => {
      serverSocket.connect = async () => delay(clientSocket.connectTimeout + 5000);
      const error = clientSocket.once('connect_error');
      clock.tick(clientSocket.connectTimeout + 1000);
      expect(await error).instanceOf(ConnectTimeoutError);
    });

    it('server should throw ConnectTimeoutError for client long time response for "open"', async () => {
      clientSocket.auth = async () => delay(serverSocket.connectTimeout + 5000);
      const error = serverSocket.once('connect_error');
      clock.tick(serverSocket.connectTimeout + 1000);
      expect(await error).instanceOf(ConnectTimeoutError);
    });
  });

  describe('keepalive', function () {
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

    it('client should keep keepalive with server when open', async () => {
      serverSocket.keepalive = 9999;
      await onceConnected(clientSocket);
      expect(clientSocket.keepalive).equal(9999);
    });

    it('should keep alive with default', async () => {
      const serverEvents: string[] = [];
      const clientEvents: string[] = [];

      await onceConnected(serverSocket, clientSocket);

      serverSocket.onAny(event => serverEvents.push(event));
      clientSocket.onAny(event => clientEvents.push(event));

      await clock.tickAsync(serverSocket.keepalive * 2);

      expect(serverSocket.isConnected()).true();
      expect(clientSocket.isConnected()).true();
      expect(serverEvents).deepEqual(['packet_create', 'packet', 'heartbeat']);
      expect(clientEvents).deepEqual(['packet', 'heartbeat', 'packet_create']);
    });

    it('should close if keepalive timeout', async () => {
      await onceConnected(serverSocket, clientSocket);
      expect(serverSocket.isOpen()).true();
      sinon.stub(serverSocket as any, 'handleAliveExpired');
      await clock.tickAsync(serverSocket.keepalive * 5);
      expect(serverSocket.isOpen()).false();
    });
  });

  describe('unilaterally closing', () => {
    let clock: sinon.SinonFakeTimers;

    beforeEach(() => {
      clock = sinon.useFakeTimers();
    });

    afterEach(() => {
      clock.restore();
    });

    describe('transport with closing insensitive', () => {
      it('server should keep open until keepalive timeout after client socket closed', async () => {
        const [serverSocket, clientSocket] = givenSocketPair('test');
        await onceConnected(serverSocket, clientSocket);
        await clientSocket.close();
        expect(serverSocket.isOpen()).true();
        // wait enough time for alive timeout
        await clock.tickAsync(serverSocket.keepalive * 5);
        expect(serverSocket.isOpen()).false();
      });

      it('client should keep open until keepalive timeout after server socket closed ', async () => {
        const [serverSocket, clientSocket] = givenSocketPair('test');
        await onceConnected(serverSocket, clientSocket);
        await serverSocket.close();
        expect(clientSocket.isOpen()).true();
        // wait enough time for alive timeout
        await clock.tickAsync(clientSocket.keepalive * 5);
        expect(clientSocket.isOpen()).false();
      });
    });

    describe('transport with closing sensitive', function () {
      it('server should close immediately after client socket closed', async () => {
        const [serverSocket, clientSocket] = givenSocketPair('test', {transport: {closeSensitive: true}});
        await onceConnected(serverSocket, clientSocket);
        await clientSocket.close();
        expect(serverSocket.isOpen()).false();
      });

      it('client should close immediately after server socket closed ', async () => {
        const [serverSocket, clientSocket] = givenSocketPair('test', {transport: {closeSensitive: true}});
        await onceConnected(serverSocket, clientSocket);
        await serverSocket.close();
        expect(clientSocket.isOpen()).false();
      });
    });
  });
});
