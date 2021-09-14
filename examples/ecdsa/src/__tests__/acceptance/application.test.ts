import {expect} from '@loopback/testlab';
import net, {AddressInfo} from 'net';
import {Client, connect} from '@drpc/client';
import {Identity, Signer} from '@libit/josa';
import {setupServer} from '../../server';
import {EcdsaApplication} from '../../application';
import {Greeting} from '../../services/greeting.def';
import {MetadataKeys} from '@drpc/core';

describe('EcdsaApplication', function () {
  const signer = new Signer();
  let app: EcdsaApplication;
  let server: net.Server;
  let port: number;
  let client: Client;
  let identity: Identity;

  before(givenRunningApplication);
  after(() => server.close());

  before(async () => {
    identity = signer.createIdentity();
    client = await connect(`tcp://localhost:${port}`, {
      connector: await import('@drpc/connector-tcp'),
      clientId: identity.id,
      metadata: {
        authmethod: 'ecdsa',
      },
      onauth: carrier => {
        const [data] = carrier.getAsBuffer('authdata');
        const authdata = signer.signAndPack(data, identity);
        carrier.set(MetadataKeys.AUTH_METHOD, 'ecdsa');
        carrier.set('authdata', authdata);
        carrier.respond = 'auth';
      },
    });
    client.on('error', console.error);
    client.on('error', console.error);
  });

  it('gets a greeting', async function () {
    const greeting = client.service<Greeting>(Greeting.namespace);
    const res = await greeting.call('greet', ['Torry']);
    expect(res).equal('Hello, Torry');
  });

  async function givenRunningApplication() {
    app = new EcdsaApplication();
    server = await setupServer(app);
    port = (server.address() as AddressInfo).port;
  }
});
