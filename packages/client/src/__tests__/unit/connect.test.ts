import * as path from 'path';
import {expect} from '@loopback/testlab';
import {AuthMethods, MetadataKeys} from '@drpc/core';
import * as dummy from '../fixtures/dummy';
import {connect} from '../../connect';
import {MemoryTransport} from '@drpc/testlab';

describe('connect', function () {
  it('should reject with missing protocol without protocol', async () => {
    await expect(connect({})).rejectedWith(/Missing protocol/);
  });

  it('connect via connector', async () => {
    const client = await connect('tcp://localhost', {connector: dummy});
    expect(client).is.ok();
    await client.close();
  });

  it('connect via connector path', async () => {
    const client = await connect('tcp://localhost', {connector: path.resolve(__dirname, '../fixtures/dummy')});
    expect(client).is.ok();
    await client.close();
  });

  it('connect via bot existed connector path', async () => {
    await expect(connect('tcp://localhost', {connector: 'no_exist'})).rejectedWith(/is not installed/);
  });

  it('support clientId passed in the query string of the url', async () => {
    const client = await connect('tcp://localhost?clientId=abc', {connector: dummy});
    expect(client.options.clientId).equal('abc');
  });

  it('connect with username and password properties', async () => {
    const client = await connect('tcp://localhost', {
      connector: dummy,
      username: 'foo',
      password: 'bar',
    });

    expect(client.metadata.get(MetadataKeys.AUTH_METHOD)).deepEqual([AuthMethods.BASIC]);
    expect(client.metadata.get(MetadataKeys.AUTH_DATA)).deepEqual(['foo:bar']);
  });

  it('connect with username and password via auth property', async () => {
    const client = await connect('tcp://localhost', {
      connector: dummy,
      auth: 'foo:bar',
    });

    expect(client.metadata.get(MetadataKeys.AUTH_METHOD)).deepEqual([AuthMethods.BASIC]);
    expect(client.metadata.get(MetadataKeys.AUTH_DATA)).deepEqual(['foo:bar']);
  });

  it('connect with multiple servers', async () => {
    const servers = [
      {
        host: '10.0.0.1',
        port: 1999,
      },
      {
        host: '10.0.0.2',
        port: 1999,
      },
    ];
    const client = await connect({
      connector: dummy,
      protocol: 'tcp',
      servers,
    });

    for (const server of servers) {
      expect((<MemoryTransport>client.transport).options.host).equal(server.host);
      await client.close();
      await client.connect();
    }
  });
});
