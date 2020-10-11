import {MessagePort} from 'worker_threads';
import {Connection, ConnectionOptions, Packet, syncl} from '@remly/core';

export interface WorkerClientOptions extends ConnectionOptions {
  port: MessagePort;
}

export class WorkerClient extends Connection {
  protected port: MessagePort;

  constructor(options: WorkerClientOptions) {
    super(options);
    this.port = options.port;
    if (this.port) {
      this.init();
      this.doConnected();
    }
  }

  protected bind(): void {
    this.port.on(
      'message',
      syncl(async (data: any) => {
        await this.feed(data);
      }, this),
    );

    this.port.on('messageerror', err => {
      this.error(err);
    });

    this.port.on(
      'close',
      syncl(async () => {
        await this.end();
      }, this),
    );

    this.port.on(
      'error',
      syncl(async (err: any) => {
        this.error(err);
        await this.end();
      }, this),
    );
  }

  protected async close(): Promise<void> {
    this.port.close();
  }

  protected async send(packet: Packet): Promise<void> {
    this.port.postMessage(packet.frame());
  }
}
