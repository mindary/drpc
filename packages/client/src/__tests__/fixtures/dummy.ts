import {MemoryTransport} from '@drpc/testlab';
import {Client} from '../../client';
import {ClientOptions} from '../../types';

export function connect(client: Client, opts: ClientOptions & {servername?: string}) {
  return new MemoryTransport(opts);
}
