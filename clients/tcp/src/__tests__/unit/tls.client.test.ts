import * as tls from 'tls';
import {Certs, createTlsServer} from '@remly/testlab';
import {Application} from '@remly/server';
import {RpcSuite} from '@remly/testsuite';
import {tcp} from '@remly/transport-tcp';
import {connect} from '@remly/client';
import * as channel from '../..';
import {expect} from '@loopback/testlab';

describe('tls client', function () {
  let app: Application;
  let server: tls.Server;
  let port: number;

  before(() => {
    app = RpcSuite.givenApplication();
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
        channel,
        protocol: 'tls',
        port,
        ca: [Certs.tlsCert],
        rejectUnauthorized: true,
      });
      client.on('error', console.error);
      await app.once('connection');
      await client.close();
    });

    it('should validate successfully the CA using URI', async () => {
      const client = await connect(`tls://localhost:${port}`, {
        channel,
        ca: [Certs.tlsCert],
        rejectUnauthorized: true,
      });
      client.on('error', console.error);
      await app.once('connection');
      await client.close();
    });

    it('should validate successfully the CA using URI with path', async () => {
      const client = await connect(`tls://localhost:${port}/`, {
        channel,
        ca: [Certs.tlsCert],
        rejectUnauthorized: true,
      });
      client.on('error', console.error);
      await app.once('connection');
      await client.close();
    });

    it('should validate unsuccessfully the CA', async () => {
      const client = await connect({
        channel,
        protocol: 'tls',
        port,
        ca: [Certs.wrongCert],
        rejectUnauthorized: true,
      });

      const error = await client.once('error');
      expect(error.message).match(/self signed certificate/);
    });

    it('should emit close on TLS error', async () => {
      const client = await connect({
        channel,
        protocol: 'tls',
        port,
        ca: [Certs.wrongCert],
        rejectUnauthorized: true,
      });

      await client.once('close');
    });

    it('should support SNI on the TLS connection', async () => {
      let servername = '';
      const host = 'localhost';
      const client = await connect({
        channel,
        protocol: 'tls',
        port,
        ca: [Certs.tlsCert],
        rejectUnauthorized: true,
        host,
      });

      app.onconnect = carrier => {
        servername = carrier.socket.transport.socket.servername;
      };

      await app.once('connection');
      expect(servername).equal(host);
      await client.close();
    });
  });
});
