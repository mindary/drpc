import * as tcp from '@drpc/transport-tcp';
import * as ws from '@drpc/transport-ws';
import {Transport, TransportOptions} from '@drpc/core';

export interface TransportFactory {
  accept(socket: any, options?: TransportOptions): Transport | undefined;
}

const transports: TransportFactory[] = [tcp, ws];

export function accept(socket: any, options?: TransportOptions) {
  for (const factory of transports) {
    const answer = factory.accept(socket, options);
    if (answer) return answer;
  }
  throw new Error('Unsupported socket');
}
