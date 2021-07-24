import path from 'path';
import {CommonTestSuite, waitForConnection} from '@remly/transport-tests';
import {WorkerServer} from '../worker.server';

describe('WebWorker transport', function () {
  let server: WorkerServer;

  beforeEach(async () => {
    server = new WorkerServer();
    CommonTestSuite.setupServer(server);
    await server.open(path.resolve(__dirname, './common.worker.js'));
  });

  afterEach(async () => {
    await server.close();
  });

  CommonTestSuite.suite(() => waitForConnection(server));
});
