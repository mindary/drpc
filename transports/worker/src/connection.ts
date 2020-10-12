import {Worker} from 'worker_threads';
import {Connection, ConnectionOptions, Packet, syncl} from '@remly/core';

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

    this.worker.on('online', () => {
      this.doConnected();
    });

    this.worker.on(
      'message',
      syncl(async (message: any) => {
        await this.feed(message);
      }, this),
    );

    this.worker.on('messageerror', error => {
      this.error(error);
    });

    this.worker.on('error', error => {
      this.error(error);
    });

    this.worker.on(
      'exit',
      syncl(async (code: number) => {
        if (code !== 0 && !this.ending) {
          // ignore exit error for end()
          this.error(new Error(`Worker stopped with exit code ${code}`));
        }
        await this.end();
      }, this),
    );
  }

  protected async close() {
    await this.worker?.terminate();
  }

  protected async send(packet: Packet) {
    this.worker?.postMessage(packet.frame());
  }
}
