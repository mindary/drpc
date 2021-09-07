import {MessagePort} from 'worker_threads';
import {PortListeners} from './types';

export * from 'worker_threads';

export function listenPort(port: MessagePort, listeners: PortListeners): () => void {
  const {onerror, onmessage, onmessageerror, onclose} = listeners;
  if (onerror) port.on('error', onerror);
  if (onmessage) port.on('message', onmessage);
  if (onmessageerror) port.on('messageerror', onmessageerror);
  if (onclose) port.on('close', onclose);

  return () => {
    if (onerror) port.off('error', onerror);
    if (onmessage) port.off('message', onmessage);
    if (onmessageerror) port.off('messageerror', onmessageerror);
    if (onclose) port.off('close', onclose);
  };
}
