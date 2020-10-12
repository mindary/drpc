import path from 'path';
import {CommonTestSuite, waitForConnection} from '@remly/transport-tests';
import {WorkerServer} from '../server';

describe('worker/common', function () {
  let server: WorkerServer;

  beforeEach(async () => {
    server = new WorkerServer();
    CommonTestSuite.setupServer(server);
    server.open(path.resolve(__dirname, './common.worker.js'));
  });

  afterEach(async () => {
    await server.close();
  });

  CommonTestSuite.suite(() => waitForConnection(server));
});
