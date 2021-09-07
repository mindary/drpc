import {givenMemoryTransportPair, Monster, monster} from '@remly/testlab';
import {expect} from '@loopback/testlab';
import {ClientSocket, RegistryMixin, Transport} from '@remly/core';
import {Application} from '../../application';

describe('Application', function () {
  it('should work', async () => {
    // prepare application
    const app = new ApplicationWithRegistry();
    app.register(Monster.name, monster);

    // prepare client and server transport
    const [client, transport] = givenSocketPair();
    const service = client.remote.service(Monster);

    // connect
    app.handle(transport);

    // wait for connected
    await client.once('connected');

    expect(app.connections.size).equal(1);

    // Rpc call
    const result = await service.add(1, 2);
    expect(result).equal(3);

    // close
    await client.close();

    expect(app.connections.size).equal(0);
  });

  class ApplicationWithRegistry extends RegistryMixin(Application) {}

  function givenSocketPair(): [ClientSocket, Transport] {
    const [t1, t2] = givenMemoryTransportPair();
    const client = new ClientSocket();
    client.setTransport(t1);
    return [client, t2];
  }
});
