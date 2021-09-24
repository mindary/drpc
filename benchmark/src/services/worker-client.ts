import {drpc, UntypeParametersForService} from '@drpc/registry';
import {CallRequest} from '@drpc/core';
import * as os from 'os';
import {IBenchmarkClientCtor, IBenchmarkServerCtor} from '../types';
import {ClientMarkOptions, ClientRunOptions, ClientStatus, WorkerClient} from '../defines/worker-client';
import {loadProvider} from '../utils';

@drpc('WorkerClient')
export class WorkerClientImpl implements UntypeParametersForService<WorkerClient> {
  BenchmarkClient: IBenchmarkClientCtor;

  constructor(provider: string) {
    const {BenchmarkClient} = loadProvider(provider);
    this.BenchmarkClient = BenchmarkClient;
  }

  @drpc.method()
  async run(opts: ClientRunOptions, @drpc.request() req: CallRequest): Promise<ClientStatus> {
    const client = (req.socket.data.client = new this.BenchmarkClient(
      opts.serverTargets,
      opts.clientChannels,
      opts.histogramParams,
      opts.securityParams,
    ));

    if (opts.load.closedLoop) {
      await client.startClosedLoop(opts.rpcsPerChannel, opts.method, opts.reqSize, opts.resSize);
    } else if (opts.load.poisson) {
      await client.startPoisson(
        opts.rpcsPerChannel,
        opts.method,
        opts.reqSize,
        opts.resSize,
        opts.load.poisson.offeredLoad,
      );
    } else {
      throw new Error('Unsupported LoadParams type');
    }

    const stats = client.mark();
    return {stats};
  }

  @drpc.method()
  async mark(opts: ClientMarkOptions, @drpc.request() req: CallRequest): Promise<ClientStatus> {
    const {client} = req.socket.data;
    const stats = client.mark();
    return {stats};
  }

  @drpc.method()
  async cores(): Promise<{cores: number}> {
    return {cores: os.cpus().length};
  }
}
