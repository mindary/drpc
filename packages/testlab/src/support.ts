import * as path from 'path';
import * as fs from 'fs';
import {ClientSocketOptions, ServerSocketOptions} from '@drpc/core';
import {MemoryTransportOptions} from './memory.transport';

export interface SocketsOptions {
  ignoreErrors?: boolean;
  client?: Partial<ClientSocketOptions>;
  server?: Partial<ServerSocketOptions>;
  transport?: MemoryTransportOptions;
}

export function fixturePath(...segs: string[]): string {
  return path.join(__dirname, '../fixtures', ...segs);
}

export function loadFixture(...segs: string[]): Buffer {
  return fs.readFileSync(fixturePath(...segs));
}
