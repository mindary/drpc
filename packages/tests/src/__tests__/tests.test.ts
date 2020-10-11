import {MockServer} from '../mocks/mock.server';
import {MockClient} from '../mocks/mock.client';
import {common} from '../common';

describe('tests', function () {
  let server: MockServer;
  let client: MockClient;

  beforeEach(() => {
    server = new MockServer();
    client = MockClient.connect(server);

    common.setupServer(server);
  });

  describe(
    'common',
    common.test(() => client),
  );
});
