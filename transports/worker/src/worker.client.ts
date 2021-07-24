import {MessagePort} from 'worker_threads';
import {Connection, ConnectionOptions, DefaultRegistry, Packet} from '@remly/core';

export interface WorkerClientOptions extends ConnectionOptions {
  port: MessagePort;
}

export class WorkerClient extends Connection {
  protected port: MessagePort;

  constructor(options: WorkerClientOptions) {
    super(options);
    // enable client service
    this.registry = this.registry ?? new DefaultRegistry();
    this.port = options.port;
    if (this.port) {
      this.init();
      // eslint-disable-next-line no-void
      void this.doConnected();
    }
  }

  protected bind(): void {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.port.on('message', async (data: any) => {
      await this.feed(data);
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.port.on('messageerror', async err => {
      await this.error(err);
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.port.on('close', async () => {
      await this.end();
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this.port.on('error', async (err: any) => {
      await this.error(err);
      await this.end();
    });
  }

  protected async close(): Promise<void> {
    this.port.close();
  }

  protected async send(packet: Packet): Promise<void> {
    this.port.postMessage(packet.frame());
  }
}
