import {isMainThread, parentPort} from 'worker_threads';
import {common} from '@remly/tests';
import {WorkerClient} from '../client';

if (isMainThread || !parentPort) {
  throw new Error('This script should run in worker');
}

const client = new WorkerClient({port: parentPort!});
client.on('error', error => {
  console.error(error);
});

common.setupConnection(client);
