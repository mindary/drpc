import {MockServer, MockClient} from './mocks/rpc';
import delay from 'delay';
import {expect} from '@tib/testlab';

describe('connection-integration', function () {
  it('should work', async function () {
    const server = new MockServer();
    server.register('greet', async (message: string) => {
      await delay(100);
      return 'Hello ' + message;
    });

    const client = MockClient.connect(server);
    const result = await client.call('greet', 'Tom');
    expect(result).equal('Hello Tom');
  });
});
