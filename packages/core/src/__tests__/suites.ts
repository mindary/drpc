import {expect} from '@tib/testlab';
import {RPC} from '..';
import {Counter} from './support';

export interface SuiteOptions {
  instanceOfClient: boolean;
}

export function suitesCommonForClient(
  getClient: () => RPC,
  options: Partial<SuiteOptions> = {},
) {
  options = {instanceOfClient: true, ...options};

  return function () {
    let client: RPC;

    beforeEach(() => {
      client = getClient();
    });

    if (options.instanceOfClient) {
      it('should be an instance of jayson.Client', () => {
        expect(client).instanceOf(RPC);
      });
    }

    it('should be able to request a success-method on the server', async () => {
      const a = 11,
        b = 12;
      const result = await client.request('add', [a, b]);
      expect(result).ok();
      expect(result).equal(a + b);
    });

    it('should be able to request an error-method on the server', async () => {
      let err: any;
      try {
        await client.request('error');
      } catch (e) {
        err = e;
      }
      expect(err).ok();
      expect(err?.message).equal('An error message');
      expect(err?.code).equal(-1000);
    });

    it('should be able to request an exception-method on the server', async () => {
      let err: any;
      try {
        await client.request('exception');
      } catch (e) {
        err = e;
      }

      expect(err).deepEqual({
        code: -32603,
        message: 'Internal error',
        data: {
          name: 'Error',
          message: 'An exception message',
        },
      });
    });

    it('should support reviving and replacing', async () => {
      const a = 2,
        b = 1;
      const instance = new Counter(a);

      const result = await client.request('incrementCounterBy', [instance, b]);
      expect(result).ok();
      expect(result).instanceOf(Counter);
      expect(result).not.deepEqual(instance);
      expect(result.count).equal(a + b);
    });
  };
}
