import {WorkerListeners} from './types';

type WorkerType = Worker;
type WorkerOptionsType = WorkerOptions;
type URLType = URL;

export {WorkerType as Worker, WorkerOptionsType as WorkerOptions, URLType as URL};

export function listenWorker(worker: Worker, listeners: WorkerListeners): Function {
  const onerror = (error: ErrorEvent) => listeners.onerror?.(error);
  const onmessage = (message: MessageEvent) => listeners.onmessage?.(message.data);
  const onmessageerror = (message: MessageEvent) => listeners.onmessageerror?.(message.data);
  worker.addEventListener('error', onerror);
  worker.addEventListener('message', onmessage);
  worker.addEventListener('messageerror', onmessageerror);

  return () => {
    worker.removeEventListener('error', onerror);
    worker.removeEventListener('message', onmessage);
    worker.removeEventListener('messageerror', onmessageerror);
  };
}
