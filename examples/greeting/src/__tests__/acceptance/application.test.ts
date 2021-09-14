import {expect} from '@loopback/testlab';
import * as net from 'net';
import {AddressInfo} from 'net';
import {Client, connect} from '@drpc/client';
import {GreetingApplication} from '../../application';
import {Greeting} from '../../services/greeting.def';
import {setupServer} from '../../server';

describe('GreetingApplication', function () {
  let app: GreetingApplication;
  let server: net.Server;
  let port: number;
  let client: Client;

  before(givenRunningApplication);
  after(() => server.close());

  before(async () => {
    client = await connect(`tcp://localhost:${port}`, {
      // TODO find a way to dynamic load channel by protocol in mono-project.
      //   in mono-project, dependencies are added with link, it affect requiring to find proper channel module
      channel: await import('@drpc/connector-tcp'),
    });
  });

  it('gets a greeting', async function () {
    const greeting = client.service<Greeting>(Greeting.namespace);
    const res = await greeting.call('greet', ['Torry']);
    expect(res).equal('Hello, Torry');
  });

  async function givenRunningApplication() {
    app = new GreetingApplication();
    server = await setupServer(app);
    port = (server.address() as AddressInfo).port;
  }
});
