import {isMainThread, parentPort} from 'worker_threads';
import {ThreadWorker} from '@remly/threads-worker';

// eslint-disable-next-line no-void
void (async () => {
  if (isMainThread || !parentPort) {
    // throw new Error('This script should run in worker');
    return;
  }

  const client = new ThreadWorker(parentPort);
  client.on('error', console.error);
  await client.once('connected');
  await client.close();
})();
