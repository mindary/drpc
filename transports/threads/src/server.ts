import {Emittery, UnsubscribeFn} from '@libit/emittery';
import {TransportError, TransportHandler} from '@remly/core';
import {URL, Worker, WorkerOptions} from './worker';
import {WorkerTransport} from './transport';

export interface TreadMainEvents {
  transportError: TransportError;
}

export class ThreadMain extends Emittery<TreadMainEvents> {
  public readonly transports: Set<WorkerTransport> = new Set();
  protected transportsUnsubs: Map<WorkerTransport, UnsubscribeFn[]> = new Map();

  constructor(public handler: TransportHandler) {
    super();
  }

  open(file: string | URL, options?: WorkerOptions) {
    this.handler.handle(this.createTransport(new Worker(file, options)));
  }

  async close() {
    for (const transport of this.transports) {
      await transport.close('force close');
    }
  }

  protected createTransport(worker: Worker) {
    return this.add(new WorkerTransport(worker));
  }

  protected add(transport: WorkerTransport) {
    this.transports.add(transport);
    this.transportsUnsubs.set(transport, [
      transport.on('error', error => this.emit('transportError', error)),
      transport.on('close', () => this.remove(transport)),
    ]);
    return transport;
  }

  protected remove(transport: WorkerTransport) {
    if (this.transports.has(transport)) {
      this.transports.delete(transport);
      this.transportsUnsubs.get(transport)?.forEach(fn => fn());
      this.transportsUnsubs.clear();
    }
  }
}
