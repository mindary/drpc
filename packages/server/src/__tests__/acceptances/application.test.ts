import {givenMemoryTransportPair, Monster, monster} from '@drpc/testlab';
import {expect} from '@loopback/testlab';
import {ClientSocket, ClientSocketOptions, Transport} from '@drpc/core';
import {Application} from '../../application';
import {RegistryMixin} from '@drpc/registry';

describe('Application', function () {
  it('connect successful', async () => {
    // prepare application
    const app = new Application();

    // prepare client and server transport
    const [client, transport] = givenSocketPair();

    // connect
    app.handle(transport);

    // wait for connected
    await app.once('connection');

    expect(app.connections.size).equal(1);

    // close
    await client.close();

    expect(app.connections.size).equal(0);
  });

  it('call successful', async () => {
    // prepare application
    const app = new ApplicationWithRegistry();
    app.register(Monster.name, monster);

    // prepare client and server transport
    const [client, transport] = givenSocketPair();
    const service = client.remote.service(Monster);

    // connect
    app.handle(transport);

    // wait for connected
    await app.once('connection');

    // call
    const result = await service.add(1, 2);
    expect(result).equal(3);

    // close
    await client.close();
  });

  it('should have only one connection for same clientId', async function () {
    let closed = false;
    // prepare application
    const app = new Application();

    // prepare client and server transport
    const [client1, transport1] = givenSocketPair({clientId: '123'});
    app.handle(transport1);
    client1.on('close', () => (closed = true));
    await app.once('connection');
    expect(app.connections.size).equal(1);

    const [client2, transport2] = givenSocketPair({clientId: '123'});
    app.handle(transport2);
    await app.once('connection');
    expect(app.connections.size).equal(1);
    expect(closed).is.true();
    expect(client1.state).equal('closed');

    // close
    await client2.close();
  });

  class ApplicationWithRegistry extends RegistryMixin(Application) {}

  function givenSocketPair(options?: Partial<ClientSocketOptions>): [ClientSocket, Transport] {
    const [t1, t2] = givenMemoryTransportPair();
    const client = new ClientSocket(options);
    client.setTransport(t1);
    return [client, t2];
  }
});
