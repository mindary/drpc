import {givenMemoryTransportPair, MonsterService, monster} from '@remly/testlab';
import {expect} from '@loopback/testlab';
import {Transport} from '@remly/core';
import {Client} from '@remly/client';
import {Application} from '../../application';

describe('Application', function () {
  it('should work', async () => {
    // prepare application
    const app = new Application();
    app.register(monster);

    // prepare client and server transport
    const [client, transport] = givenConnectionPair();
    const service = client.service<MonsterService>();

    // connect
    app.handle(transport);

    // wait for connected
    await client.once('connected');

    expect(app.connections.size).equal(1);

    // RPC call
    const result = await service.call('add', [1, 2]);
    expect(result).equal(3);

    // close
    await client.close();

    expect(app.connections.size).equal(0);
  });

  function givenConnectionPair(): [Client, Transport] {
    const [t1, t2] = givenMemoryTransportPair();
    const client = new Client().setTransport(t1);
    return [client, t2];
  }
});
