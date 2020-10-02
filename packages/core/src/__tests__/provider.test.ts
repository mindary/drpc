import {Provider, TimeoutError} from '..';
import {expect} from '@tib/testlab';

describe('provider', () => {
  let server: Provider;
  let client: Provider;
  let errorServer: Error | null;
  let errorClient: Error | null;

  beforeEach(() => {
    server = new Provider(async (message, transfer) => {
      client.handle(message);
      return true;
    }, 50);

    client = new Provider(async (message, transfer) => {
      server.handle(message);
      return true;
    }, 50);
    server.on('error', err => (errorServer = err));
    client.on('error', err => (errorClient = err));

    errorServer = errorClient = null;
  });

  describe('request', () => {
    it('methods can return values', async () => {
      server.method('action', () => 10);

      const result = await client.request('action');
      expect(result).equal(10);
      expect(errorClient).not.ok();
      expect(errorServer).not.ok();
    });

    it('methods can return promises', async () => {
      server.method(
        'action',
        () => new Promise(resolve => setTimeout(() => resolve(10), 15)),
      );

      const result = await client.request('action');
      expect(result).equal(10);
      expect(errorClient).not.ok();
      expect(errorServer).not.ok();
    });

    it('Promise rejection is transferred', async () => {
      server.method(
        'action',
        () =>
          new Promise((resolve, reject) => setTimeout(() => reject(10), 15)),
      );

      let err: any;

      try {
        await client.request('action');
      } catch (e) {
        err = e;
      }

      expect(err).deepEqual({
        code: -32603,
        data: 10,
        message: 'Internal error',
      });
      expect(errorClient).not.ok();
      expect(errorServer).not.ok();
    });

    it('Invalid calls are rejected without throws both ends', async () => {
      // return client.request('action').then(
      //   () => Promise.reject('should have been rejected'),
      //   () => undefined
      // ).then(() => {
      //   assert(!errorClient);
      //   assert(!errorServer);
      // });

      let err: any;

      try {
        await client.request('action');
      } catch (e) {
        err = e;
      }
      expect(err).ok();
      expect(errorClient).not.ok();
      expect(errorServer).not.ok();
    });

    it('request calls time out', async () => {
      server.method(
        'action',
        () => new Promise(r => setTimeout(() => r(10), 100)),
      );
      // return client.request('action').then(
      //   () => Promise.reject('should have been rejected'),
      //   (err) => {
      //     assert.instanceOf(err, TimeoutError);
      //   }
      // )
      let err: any;

      try {
        await client.request('action');
      } catch (e) {
        err = e;
      }
      expect(err).instanceOf(TimeoutError);
    });

    it('multiple request do not interfere', async () => {
      server.method(
        'a1',
        (value: number) => new Promise(r => setTimeout(() => r(value), 30)),
      );
      server.method('a2', (value: number) => 2 * value);

      const [r1, r2] = await Promise.all([
        client.request('a1', 10),
        client.request('a2', 20),
      ]);

      expect(r1).equal(10);
      expect(r2).equal(40);
      expect(errorClient).not.ok();
      expect(errorServer).not.ok();
    });

    it('methods can be removed', async () => {
      server.method('action', () => 10);
      server.removeMethod('action');

      let err: any;
      try {
        await client.request('action');
      } catch (e) {
        err = e;
      }

      expect(err).ok();
      expect(errorClient).not.ok();
      expect(errorServer).not.ok();
    });
  });

  describe('signals', () => {
    it('Signals are propagated', async () => {
      let x = -1;
      server.onSignal('action', (value: number) => (x = value));
      await client.signal('action', 5);

      expect(errorServer).not.ok();
      expect(errorClient).not.ok();
      expect(x).equal(5);
    });

    it('Multiple signals do not interfere', async () => {
      let x = -1,
        y = -1;

      server.onSignal('setx', (value: number) => (x = value));
      server.onSignal('sety', (value: number) => (y = value));

      await client.signal('setx', 5);
      await client.signal('sety', 6);

      expect(errorServer).not.ok();
      expect(errorClient).not.ok();
      expect(x).equal(5);
      expect(y).equal(6);
    });

    it('Multiple listeners can be bound to one signal', async () => {
      let x = -1;

      server.onSignal('action', (value: number) => (x = value));

      await client.signal('action', 1);
      await client.signal('action', 2);

      expect(errorServer).not.ok();
      expect(errorClient).not.ok();
      expect(x).equal(2);
    });

    it('Listeners can be dispose', async () => {
      let x = -1;

      const s = server.onSignal('action', (value: number) => (x = value));
      s.dispose();

      await client.signal('action', 5);

      expect(x).equal(-1);
    });
  });
});
