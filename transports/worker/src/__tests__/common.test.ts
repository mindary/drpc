import {common, waitForConnection} from '@remly/tests';
import {WorkerServer} from '../server';
import path from 'path';

describe('worker/common', function () {
  let server: WorkerServer;

  beforeEach(async () => {
    server = new WorkerServer();
    common.setupServer(server);
    server.open(path.resolve(__dirname, './common.worker.js'));
  });

  afterEach(async () => {
    await server.close();
  });

  describe(
    'common',
    common.test(() => waitForConnection(server)),
  );
});
