import {UnsubscribeFn} from '@libit/emittery';
import {TransportError} from '@remly/core';
import {URL, Worker, WorkerOptions} from './worker';
import {WorkerTransport} from './transport';
import {Application, Server, ServerEvents} from '@remly/server';

export interface TreadMainEvents extends ServerEvents {
  transportError: TransportError;
}

export class ThreadMain extends Server<{}, TreadMainEvents> {
  public readonly transports: Set<WorkerTransport> = new Set();
  protected transportsUnsubs: Map<WorkerTransport, UnsubscribeFn[]> = new Map();

  constructor(app?: Application) {
    super(app);
  }

  async open(file: string | URL, options?: WorkerOptions) {
    const transport = this.createTransport(new Worker(file, options));
    await this.emit('transport', transport);
  }

  async close() {
    for (const transport of this.transports) {
      await transport.close('force close');
    }
  }

  start() {
    //
  }

  async stop() {
    await this.close();
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
