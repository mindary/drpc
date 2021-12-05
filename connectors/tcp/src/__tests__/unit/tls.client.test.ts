import * as tls from 'tls';
import {Certs, createTlsServer} from '@drpc/testlab';
import {Application, tcp} from '@drpc/server';
import {RpcSuite} from '@drpc/testsuite';
import {connect} from '@drpc/client';
import {expect} from '@loopback/testlab';
import {noop} from 'ts-essentials';
import * as connector from '../..';

describe('tls client', function () {
  let app: Application;
  let server: tls.Server;
  let port: number;

  before(() => {
    app = RpcSuite.givenApplication();
    // ignore connection errors
    app.on('connection', conn => conn.on('error', noop));
    [server, port] = createTlsServer(tcp(app.handle), {
      key: Certs.tlsKey,
      cert: Certs.tlsCert,
    });
  });

  after(done => {
    server.close(done);
  });

  describe('with secure parameters', function () {
    it('should validate successfully the CA', async () => {
      const client = await connect({
        connector,
        protocol: 'tls',
        port,
        ca: [Certs.tlsCert],
        rejectUnauthorized: true,
      });
      client.on('error', noop);
      await app.once('connection');
      await client.close();
    });

    it('should validate successfully the CA using URI', async () => {
      const client = await connect(`tls://localhost:${port}`, {
        connector,
        ca: [Certs.tlsCert],
        rejectUnauthorized: true,
      });
      client.on('error', noop);
      await app.once('connection');
      await client.close();
    });

    it('should validate successfully the CA using URI with path', async () => {
      const client = await connect(`tls://localhost:${port}/`, {
        connector,
        ca: [Certs.tlsCert],
        rejectUnauthorized: true,
      });
      client.on('error', noop);
      await app.once('connection');
      await client.close();
    });

    it('should validate unsuccessfully the CA', async () => {
      const client = await connect({
        connector,
        protocol: 'tls',
        port,
        ca: [Certs.wrongCert],
        rejectUnauthorized: true,
      });

      const error = await client.once('error');
      expect(error.message).match(/self.signed certificate/);
    });

    it('should emit close on TLS error', async () => {
      const client = await connect({
        connector,
        protocol: 'tls',
        port,
        ca: [Certs.wrongCert],
        rejectUnauthorized: true,
      });
      client.on('error', noop);
      await client.once('close');
    });

    it('should support SNI on the TLS connection', async () => {
      let servername = '';
      const host = 'localhost';
      const client = await connect({
        connector,
        protocol: 'tls',
        port,
        ca: [Certs.tlsCert],
        rejectUnauthorized: true,
        host,
      });
      client.on('error', noop);

      app.onconnect = carrier => {
        servername = carrier.socket.transport.socket.servername;
      };

      await app.once('connection');
      expect(servername).equal(host);
      await client.close();
    });
  });
});
