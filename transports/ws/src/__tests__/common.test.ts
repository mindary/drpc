import http from 'http';
import findAvailablePort from 'get-port';
import {asyncFromCallback, common} from '@remly/tests';
import {WSServer} from '../server';
import {WSClient} from '../client';

describe('ws', function () {
  let _server: http.Server;
  let server: WSServer;
  let client: WSClient;

  beforeEach(async () => {
    const port = await findAvailablePort();
    _server = http.createServer();
    server = new WSServer().attach(_server);
    _server.listen(port);
    client = WSClient.connect(port);

    common.setupServer(server);
  });

  afterEach(async () => {
    await client.end();
    await asyncFromCallback(cb => _server.close(cb));
  });

  describe(
    'common',
    common.test(() => client),
  );
});
