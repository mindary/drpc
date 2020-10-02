import * as s from './support';
import {Counter} from './support';
import {expect} from '@tib/testlab';

describe('rpc', () => {
  describe('basic', function () {
    it('should have transport property', async () => {
      const {client, server} = s.givenAPairOfRPCWithMockChannel(s.methods);
      expect(client.transport).ok();
      expect(server.transport).ok();
    });
  });

  describe('request', () => {
    it('should add', async () => {
      const {client} = s.givenAPairOfRPCWithMockChannel(s.methods);
      const result = await client.request('add', [1, 2]);
      expect(result).equal(3);
    });

    it('should add slow', async () => {
      const {client} = s.givenAPairOfRPCWithMockChannel(s.methods);
      const result = await client.request('addSlow', [1, 2]);
      expect(result).equal(3);
    });

    it('should incrementCounterBy', async () => {
      const {server, client} = s.givenAPairOfRPCWithMockChannel(s.methods);
      const counter = new Counter(1);
      const result = <Counter>(
        await client.request('incrementCounterBy', [counter, 2])
      );
      expect(result.count).equal(3);
    });

    it('should throw error', async () => {
      const {client} = s.givenAPairOfRPCWithMockChannel(s.methods);
      await expect(client.request('error')).rejectedWith(/An error message/);
    });
  });
});
