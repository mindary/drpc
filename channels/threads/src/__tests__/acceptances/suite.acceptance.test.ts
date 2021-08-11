import {RPCSuite} from '@remly/testsuite';
import {ThreadMain} from '../../server';
import {fixturePath} from '../support';

describe('Threads - RPC Suite', function () {
  RPCSuite.run(
    'Threads',
    async () => {
      const app = RPCSuite.givenApplication();
      const main = new ThreadMain(app);

      await main.open(fixturePath('monster.worker.js'));
      const connection = await app.once('connection');
      const close = async () => main.close();
      return {app, serverSocket: connection, clientSocket: null as any, close};
    },
    'server',
  );
});
