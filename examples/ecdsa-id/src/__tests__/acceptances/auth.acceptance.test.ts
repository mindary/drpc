import {expect} from '@loopback/testlab';
import {Identity, Signer} from '@libit/josa';
import {Client} from '@remly/tcp-client';
import {TCPServer} from '@remly/tcp';
import {setupApplication} from '../support';
import {ECDSAApplication} from '../../application';

describe('ECDSA', function () {
  const signer = new Signer();
  let identity: Identity;
  let app: ECDSAApplication;
  let client: Client;
  let server: TCPServer;

  before(givenAppAndClient);

  after(async () => {
    await client.close();
    await server.stop();
  });

  async function givenAppAndClient() {
    identity = signer.createIdentity();
    ({app, client, server} = await setupApplication({signer, identity}));
  }

  it('auth successfully', async () => {
    await client.ready();
    expect(client.id).equal(identity.id);
  });
});
