import {expect} from '@loopback/testlab';
import net, {AddressInfo} from 'net';
import {Client, connect} from '@drpc/client';
import {Identity, Signer} from '@libit/josa';
import {setupServer} from '../../server';
import {EcdsaApplication} from '../../application';
import {Greeting} from '../../services/greeting.def';

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
      channel: await import('@drpc/client-tcp'),
      clientId: identity.id,
      metadata: {
        auth: 'ecdsa',
      },
    });
    client.on('error', console.error);
    client.on('connect_error', console.error);
    client.addOutgoingInterceptor((request, next) => {
      request.metadata.set('sig-bin', signer.signAndPack(client.socket.nonce, identity));
      return next();
    });
  });

  it('gets a greeting', async function () {
    const greeting = client.remote.service(Greeting);
    const res = await greeting.greet('Torry');
    expect(res).equal('Hello, Torry');
  });

  async function givenRunningApplication() {
    app = new EcdsaApplication();
    server = await setupServer(app);
    port = (server.address() as AddressInfo).port;
  }
});
