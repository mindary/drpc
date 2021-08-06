import {Identity, Signer} from '@libit/josa';
import {AuthData, OpenContext, TCPServer} from '@remly/tcp';
import {TCPClient} from '@remly/tcp-client';
import getPort from 'get-port';
import {ECDSAApplication} from '../application';

export async function setupApplication({signer, identity}: {signer: Signer; identity: Identity}) {
  const app = new ECDSAApplication();
  const port = await getPort();
  const server = new TCPServer({port});
  app.bind(server);
  await server.start();

  const client = TCPClient.connect(port, {auth: auth({signer, identity})});

  return {app, client, server};
}

function auth({signer, identity}: {signer: Signer; identity: Identity}) {
  return async (context: OpenContext): Promise<AuthData> => {
    const {challenge} = context;
    const sig = signer.signAndPack(challenge, identity, {noTimestamp: true});
    return {sig};
  };
}
