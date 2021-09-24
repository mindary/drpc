import {Application, ApplicationOptions} from '@drpc/server';
import {RegistryMixin} from '@drpc/registry';
import {WorkerServiceImpl} from './services/worker-service';
import {WorkerClientImpl} from './services/worker-client';

export interface WorkerOptions extends ApplicationOptions {
  provider: string;
}

export class WorkerApplication extends RegistryMixin(Application) {
  constructor(options: WorkerOptions) {
    super(options);

    this.register(new WorkerServiceImpl(options!.provider));
    this.register(new WorkerClientImpl(options!.provider));
  }
}
