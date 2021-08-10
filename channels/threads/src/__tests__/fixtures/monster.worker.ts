import {isMainThread, parentPort} from 'worker_threads';
import {ThreadWorker} from '@remly/threads-worker';
import {RPCSuite} from '@remly/testsuite';

(() => {
  if (isMainThread || !parentPort) {
    // throw new Error('This script should run in worker');
    return;
  }

  const client = new ThreadWorker(parentPort);
  RPCSuite.setupClient(client);
})();
