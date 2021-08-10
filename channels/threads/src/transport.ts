import {Transport, TransportOptions, ValueOrPromise} from '@remly/core';
import {listenWorker, Worker} from './worker';

export class WorkerTransport extends Transport {
  protected unbind: () => void;

  constructor(public readonly worker: Worker, options?: TransportOptions) {
    super(options);
    this.bind();
    this.open();
  }

  protected bind() {
    this.unbind = listenWorker(this.worker, {
      onmessage: (message: any) => this.onData(message),
      onmessageerror: (error: any) => this.onError(error),
      onerror: (error: any) => this.onError(error),
      onexit: (code: number) => this.onExit(code),
    });
  }

  protected async onExit(code: number) {
    if (code !== 0 && this.isOpen()) {
      // ignore exit error for end()
      await this.onError(new Error(`Worker stopped with exit code ${code}`));
    }
    await this.doClose();
  }

  protected doSend(data: Buffer): ValueOrPromise<any> {
    return this.worker.postMessage(data);
  }

  protected async doClose(reason?: string | Error) {
    this.unbind();
    await super.doClose(reason);
    // eslint-disable-next-line @typescript-eslint/await-thenable
    await this.worker.terminate();
  }
}
