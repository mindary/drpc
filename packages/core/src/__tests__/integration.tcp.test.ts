import net, {Server, Socket} from 'net';
import * as s from './support';
import {makeRequest, nextId, RPC} from '..';
import {TcpTransport} from './support/tcp';
import {createServer} from './support/tcp.server';
import {createClient} from './support/tcp.client';
import {suitesCommonForClient} from './suites';
import {Defer} from '@tib/defer';
import {expect} from '@tib/testlab';

describe('tcp/integration', () => {
  describe('server', () => {
    let server: Server;

    before(function () {
      server = createServer(s.methods);
    });

    after(function () {
      server.close();
    });

    it('should listen to a local port', done => {
      const srv = createServer(s.methods);
      srv.listen(3999, 'localhost', () => srv.close(done));
    });

    context('connected socket', () => {
      let socket: Socket;
      let transport: TcpTransport;

      before(function (done) {
        server.listen(3999, 'localhost', done);
      });

      beforeEach(function (done) {
        socket = net.connect(3999, 'localhost', done);
        transport = new TcpTransport(socket);
      });

      afterEach(function (done) {
        transport.removeAllListeners();
        socket.end();
        done();
      });

      it('should send a parse error for invalid JSON data', async function () {
        const d = new Defer();
        let error: any = undefined;

        transport.on('message', message => {
          // parse
          error = message.error;
          // assert.include(message.error, {
          //   code: -32700, // Parse Error
          //   message: 'Parse error',
          // });
          d.resolve();
        });

        // obviously invalid
        await transport.send(<any>'abc');
        await d;

        expect(error).ok();
        expect(error).containDeep({
          code: -32700, // Parse Error
          message: 'Parse error',
        });
      });

      it('should send more than one reply on the same socket', async () => {
        const d = new Defer();
        const replies: any[] = [];
        transport.on('message', function (message) {
          replies.push(message);
          if (replies.length === 2) {
            d.resolve();
          }
        });

        // write raw requests to the socket
        await transport.send(makeRequest('delay', [20], nextId()));
        await transport.send(makeRequest('delay', [5], nextId()));

        await d;

        expect(replies).length(2);
        expect(replies[0].result).equal(5);
        expect(replies[1].result).equal(20);
      });
    });
  });

  describe('client', function () {
    let client: RPC;
    const server = createServer(s.methods);

    before(done => {
      server.listen(3999, 'localhost', done);
    });

    after(function () {
      server.close();
    });

    beforeEach(() => {
      client = createClient(3999, 'localhost');
    });

    afterEach(async () => {
      await client.close();
    });

    describe(
      'common tests',
      suitesCommonForClient(() => client),
    );
  });
});
