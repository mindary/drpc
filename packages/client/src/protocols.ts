import {ProtocolType} from './types';

export const protocols: Record<ProtocolType, string> = {
  ws: 'connector-ws',
  wss: 'connector-ws',
} as any;

if (typeof process?.versions?.node !== 'undefined') {
  Object.assign(protocols, {
    tcp: 'connector-tcp',
    tls: 'connector-tcp',
    ssl: 'connector-tcp',
  });
}
