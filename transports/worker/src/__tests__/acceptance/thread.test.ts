import {ServerSocket} from '@drpc/core';
import {WorkerTransport} from '../../worker-transport';
import {Worker} from '../../worker';
import {fixturePath} from '../support';

describe('Thread', function () {
  it('connect', async function () {
    const transport = new WorkerTransport(new Worker(fixturePath('worker.js')));
    const server = new ServerSocket(transport);
    await server.once('connected');
    await server.close();
  });
});
