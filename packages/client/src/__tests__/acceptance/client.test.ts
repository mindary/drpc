import {ApplicationWithRegistry} from '../fixtures/app';
import {monster, Monster} from '@drpc/testlab';
import * as net from 'net';
import {setupServer} from '../support';
import {connect} from '../../connect';
import {AddressInfo} from 'net';
import {expect} from '@loopback/testlab';

describe('Client', function () {
  let app: ApplicationWithRegistry;
  let server: net.Server;

  before(givenApplication);
  before(async () => {
    server = await setupServer(app);
  });

  after(function (done) {
    server.close(done);
  });

  it('should restore connected state after reconnecting', async function () {
    const client = await connect({
      protocol: 'tcp',
      port: (server.address() as AddressInfo).port,
      channel: await import('../fixtures/tcp'),
    });

    const service = client.service<Monster>(Monster.namespace);

    await client.once('connected');
    expect(await service.call('add', [1, 2])).equal(3);
    await client.close();

    await expect(service.call('add', [1, 2])).rejectedWith(/close/);

    await client.connect();
    await client.once('connected');
    expect(await service.call('add', [1, 2])).equal(3);
    await client.close();
  });

  function givenApplication() {
    app = new ApplicationWithRegistry();
    app.register(Monster.namespace, monster);
    return app;
  }
});
