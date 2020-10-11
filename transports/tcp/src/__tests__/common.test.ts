import net from 'net';
import findAvailablePort from 'get-port';
import {asyncFromCallback, common} from '@remly/tests';
import {TCPServer} from '../server';
import {TCPClient} from '../client';

describe('tcp', function () {
  let netServer: net.Server;
  let server: TCPServer;
  let client: TCPClient;

  beforeEach(async () => {
    const port = await findAvailablePort();
    netServer = net.createServer();
    server = new TCPServer().attach(netServer);
    netServer.listen(port);
    client = TCPClient.connect(port);

    common.setupServer(server);
  });

  afterEach(async () => {
    await client.end();
    await asyncFromCallback(cb => netServer.close(cb));
  });

  describe(
    'common',
    common.test(() => client),
  );
});
