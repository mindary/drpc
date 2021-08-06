import {expect} from '@loopback/testlab';
import {Application} from '@remly/server';
import {ThreadMain} from '../../server';
import {fixturePath} from '../support';

describe('Threads - Connectivity', () => {
  describe('close by main', function () {
    it('close all by ThreadMain', async () => {
      const app = new Application();
      const main = new ThreadMain(app);

      await main.open(fixturePath('client.worker.js'));
      const connection = await app.once('connection');

      expect(main.transports.size).equal(1);
      expect(connection.isConnected()).true();
      await main.close();
      expect(main.transports.size).equal(0);
      expect(connection.isOpen()).false();
    });

    it('close by main connection', async () => {
      const app = new Application();
      const main = new ThreadMain(app);

      await main.open(fixturePath('client.worker.js'));
      const connection = await app.once('connection');

      expect(main.transports.size).equal(1);
      await connection.close();
      expect(main.transports.size).equal(0);
    });
  });

  describe('close by worker', function () {
    it('close by worker connection', async () => {
      const app = new Application();
      const main = new ThreadMain(app);

      await main.open(fixturePath('close-after-connect.worker.js'));
      const connection = await app.once('connection');
      expect(connection.isConnected()).true();
      // worker should close immediately after connect
      await connection.once('close');
      expect(connection.isOpen()).false();
    });
  });
});
