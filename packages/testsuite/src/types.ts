import {Application} from '@drpc/server';
import {ClientSocket, ServerSocket, ValueOrPromise} from '@drpc/core';

export type CloseFn = () => ValueOrPromise<void>;

export interface PrepareEntry {
  app: Application;
  serverSocket: ServerSocket;
  clientSocket: ClientSocket;
  close: CloseFn;
}

export type PrepareFn = () => ValueOrPromise<PrepareEntry>;
