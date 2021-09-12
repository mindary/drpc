import {isMainThread, parentPort} from 'worker_threads';
import {ClientSocket} from '@drpc/core';
import {PortTransport} from '../../port-transport';

(() => {
  if (isMainThread || !parentPort) {
    // throw new Error('This script should run in worker');
    return;
  }

  new ClientSocket().attach(new PortTransport(parentPort));
})();
