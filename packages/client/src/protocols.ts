import {ProtocolType} from './types';

export const protocols: Record<ProtocolType, string> = {
  ws: 'client-ws',
  wss: 'client-ws',
} as any;

if (typeof process?.versions?.node !== 'undefined') {
  Object.assign(protocols, {
    tcp: 'client-tcp',
    tls: 'client-tcp',
    ssl: 'client-tcp',
  });
}
