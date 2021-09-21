import {Transport, TransportOptions} from '@drpc/core';

export interface TransportFactory {
  accept(socket: any, options?: TransportOptions): Transport | undefined;
}

const transports: TransportFactory[] = [require('@drpc/transport-tcp'), require('@drpc/transport-ws')];

export function accept(socket: any, options?: TransportOptions): Transport {
  for (const factory of transports) {
    const answer = factory.accept(socket, options);
    if (answer) return answer;
  }
  throw new Error('Unsupported socket');
}
