import {Worker} from 'worker_threads';
import {WorkerListeners} from './types';

export * from 'url';
export * from 'worker_threads';

export function listenWorker(worker: Worker, listeners: WorkerListeners): () => void {
  const {onerror, onmessage, onmessageerror, onexit} = listeners;
  if (onerror) worker.on('error', onerror);
  if (onmessage) worker.on('message', onmessage);
  if (onmessageerror) worker.on('messageerror', onmessageerror);
  if (onexit) worker.on('exit', onexit);

  return () => {
    if (onerror) worker.off('error', onerror);
    if (onmessage) worker.off('message', onmessage);
    if (onmessageerror) worker.off('messageerror', onmessageerror);
    if (onexit) worker.off('exit', onexit);
  };
}
