import getPort from 'get-port';
import {Identity, Signer} from '@libit/josa';
import {TCPServer} from '@remly/tcp';
import {TCPClient} from '@remly/tcp-client';
import {ClientSocket} from '@remly/core';
import {ECDSAApplication} from '../application';

export async function setupApplication({signer, identity}: {signer: Signer; identity: Identity}) {
  const app = new ECDSAApplication();
  const port = await getPort();
  const server = new TCPServer({port});
  app.bind(server);
  await server.start();

  const client = TCPClient.connect(port, {onconnect: auth({signer, identity})});

  return {app, client, server};
}

function auth({signer, identity}: {signer: Signer; identity: Identity}) {
  return async (socket: ClientSocket, challenge: Buffer): Promise<void> => {
    const sig = signer.signAndPack(challenge, identity, {noTimestamp: true});
    socket.metadata.auth = {sig};
  };
}
