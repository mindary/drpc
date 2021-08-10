import {isMainThread, parentPort} from 'worker_threads';
import {ThreadWorker} from '@remly/threads-worker';

(() => {
  if (isMainThread || !parentPort) {
    // throw new Error('This script should run in worker');
    return;
  }

  new ThreadWorker(parentPort);
})();
