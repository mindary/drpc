import {AsyncOrSync} from 'ts-essentials';
import {Connection} from '@remly/core';
import {Server} from '@remly/server';

export interface ServerAndClient<C extends Connection = Connection> {
  server: Server<C>;
  client: Connection;
}
export type ServerAndClientProvider<C extends Connection = Connection> = () => ServerAndClient<C>;
export type ConnectionFactory<C extends Connection = Connection> = () => AsyncOrSync<C>;
