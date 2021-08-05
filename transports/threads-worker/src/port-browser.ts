import {PortListeners} from './types';

type MessagePortType = MessagePort;

export {MessagePortType as MessagePort};

export function listenPort(port: MessagePort, listeners: PortListeners): Function {
  const onmessage = (message: MessageEvent) => listeners.onmessage?.(message.data);
  const onmessageerror = (message: MessageEvent) => listeners.onmessageerror?.(message.data);
  if (onmessage) port.addEventListener('message', onmessage);
  if (onmessageerror) port.addEventListener('messageerror', onmessageerror);

  return () => {
    if (onmessage) port.removeEventListener('message', onmessage);
    if (onmessageerror) port.removeEventListener('messageerror', onmessageerror);
  };
}
