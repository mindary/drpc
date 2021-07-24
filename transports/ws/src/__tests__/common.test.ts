import http from 'http';
import findAvailablePort from 'get-port';
import {asyncFromCallback, CommonTestSuite} from '@remly/transport-tests';
import {WebSocketServer} from '../websocket.server';
import {WebSocketClient} from '../websocket.client';

describe('WebSocket transport', function () {
  let _server: http.Server;
  let server: WebSocketServer;
  let client: WebSocketClient;

  beforeEach(async () => {
    const port = await findAvailablePort();
    _server = http.createServer();
    server = new WebSocketServer().attach(_server);
    _server.listen(port);
    client = WebSocketClient.connect(port);

    CommonTestSuite.setupServer(server);
  });

  afterEach(async () => {
    await client.end();
    await asyncFromCallback(cb => _server.close(cb));
  });

  CommonTestSuite.suite(() => client);
});
