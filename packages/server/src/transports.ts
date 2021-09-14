import {Transport, TransportOptions} from '@drpc/core';

export interface TransportFactory {
  accept(socket: any, options?: TransportOptions): Transport | undefined;
}

const transports: Promise<TransportFactory>[] = [import('@drpc/transport-tcp'), import('@drpc/transport-ws')];

export async function accept(socket: any, options?: TransportOptions) {
  for (const factory of transports) {
    const answer = (await factory).accept(socket, options);
    if (answer) return answer;
  }
  throw new Error('Unsupported socket');
}
