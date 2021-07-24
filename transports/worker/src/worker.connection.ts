import {Worker} from 'worker_threads';
import {Connection, ConnectionOptions, Packet} from '@remly/core';

export interface WorkerConnectionOptions extends ConnectionOptions {
  worker?: Worker;
}

export class WorkerConnection extends Connection {
  worker?: Worker;

  constructor(options?: WorkerConnectionOptions) {
    super(options);
    this.worker = options?.worker;
    if (this.worker) {
      this.init();
    }
  }

  protected bind(): void {
    if (!this.worker) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.worker.on('online', async () => {
      await this.doConnected();
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.worker.on('message', async (message: any) => {
      await this.feed(message);
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.worker.on('messageerror', async error => {
      await this.error(error);
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.worker.on('error', async error => {
      await this.error(error);
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.worker.on('exit', async (code: number) => {
      if (code !== 0 && !this.ending) {
        // ignore exit error for end()
        await this.error(new Error(`Worker stopped with exit code ${code}`));
      }
      await this.end();
    });
  }

  protected async close() {
    this.worker?.terminate();
  }

  protected async send(packet: Packet) {
    this.worker?.postMessage(packet.frame());
  }
}
