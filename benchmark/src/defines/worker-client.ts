import {ClientStats, SecurityParams} from '../types';
import {HistogramParams} from '../histogram';

export interface PoissonParams {
  offeredLoad: number;
}

export interface ClosedLoopParams {}

export interface LoadParams {
  closedLoop?: ClosedLoopParams;
  poisson?: PoissonParams;
}

export interface ClientRunOptions {
  serverTargets: string[];
  clientChannels: number;
  histogramParams: HistogramParams;
  securityParams: SecurityParams;
  load: LoadParams;
  rpcsPerChannel: number;
  method: string;
  reqSize: number;
  resSize: number;
}

export interface ClientMarkOptions {
  reset?: boolean;
}

export interface ClientStatus {
  stats: ClientStats;
}

export interface WorkerClient {
  run(opts: ClientRunOptions): Promise<ClientStatus>;

  mark(opts: ClientMarkOptions): Promise<ClientStatus>;

  cores(): Promise<{cores: number}>;
}
