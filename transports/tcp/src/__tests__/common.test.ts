import findAvailablePort from 'get-port';
import {CommonTestSuite} from '@remly/transport-tests';
import {TCPServer} from '../server';
import {TCPClient} from '../client';

describe('tcp', function () {
  let server: TCPServer;
  let client: TCPClient;

  beforeEach(async () => {
    const port = await findAvailablePort();
    server = new TCPServer({port});
    await server.start();

    client = TCPClient.connect(port);
    CommonTestSuite.setupServer(server);
  });

  afterEach(async () => {
    await client.end();
    await server.stop();
  });

  CommonTestSuite.suite(() => client);
});
