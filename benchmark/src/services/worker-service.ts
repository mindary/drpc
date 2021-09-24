import {CallRequest} from '@drpc/core';
import {drpc, UntypeParametersForService} from '@drpc/registry';
import console from 'console';
import os from 'os';
import {IBenchmarkServerCtor} from '../types';
import {ServerMarkOptions, ServerRunOptions, WorkerService, ServerStatus} from '../defines/worker-service';
import {loadProvider} from '../utils';

/**
 * Benchmark worker service
 */
@drpc('WorkerService')
export class WorkerServiceImpl implements UntypeParametersForService<WorkerService> {
  BenchmarkServer: IBenchmarkServerCtor;

  constructor(provider: string) {
    const {BenchmarkServer} = loadProvider(provider);
    this.BenchmarkServer = BenchmarkServer;
  }

  @drpc.method()
  async run(opts: ServerRunOptions, @drpc.request() req: CallRequest): Promise<ServerStatus> {
    console.log('ServerConfig %j', opts);
    const server = (req.socket.data.server = new this.BenchmarkServer(
      '[::]',
      opts.port,
      !!opts.securityParams,
      opts.resSize,
    ));
    await server.start();
    const stats = server.mark();
    return {stats, port: server.getPort()};
  }

  @drpc.method()
  async mark(opts: ServerMarkOptions, @drpc.request() req: CallRequest): Promise<ServerStatus> {
    const {server} = req.socket.data;
    return {stats: await server.mark(opts.reset), port: server.getPort()};
  }

  @drpc.method()
  async cores(): Promise<{cores: number}> {
    return {cores: os.cpus().length};
  }
}
