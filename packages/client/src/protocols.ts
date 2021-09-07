import {ProtocolType} from './types';

export const protocols: Record<ProtocolType, string> = {
  ws: 'ws',
  wss: 'ws',
} as any;

if (typeof process?.versions?.node !== 'undefined') {
  Object.assign(protocols, {
    tcp: 'tcp',
    tls: 'tcp',
    ssl: 'tcp',
  });
}
