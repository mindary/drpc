import {RpcSuite} from '@remly/testsuite';
import {ThreadMain} from '../../server';
import {fixturePath} from '../support';

describe('Threads - Suite', function () {
  RpcSuite.run(async () => {
    const app = RpcSuite.givenApplication();
    const main = new ThreadMain(app);

    await main.open(fixturePath('monster.worker.js'));
    const connection = await app.once('connection');
    const close = async () => main.close();
    return {app, serverSocket: connection, clientSocket: null as any, close};
  }, 'server');
});
