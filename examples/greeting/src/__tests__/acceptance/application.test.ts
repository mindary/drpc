import {expect} from '@loopback/testlab';
import * as net from 'net';
import {AddressInfo} from 'net';
import {Client, connect} from '@drpc/client';
import {GreetingApplication} from '../../application';
import {Greeting} from '../../services/greeting.def';
import {setupServer} from "../../server";

describe('Application', function () {
  let app: GreetingApplication;
  let server: net.Server;
  let port: number;
  let client: Client;

  before(givenRunningApplication);
  after(() => server.close());

  before(async () => {
    client = await connect(`tcp://localhost:${port}`);
  });

  it('gets a greeting', async function () {
    const greeting = client.remote.service(Greeting);
    const res = await greeting.greet('DRPC');
    expect(res).equal('Hello, DRPC');
  });

  async function givenRunningApplication() {
    app = new GreetingApplication();
    server = await setupServer(app);
    port = (server.address() as AddressInfo).port;
  }
});
