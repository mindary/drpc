import {SecurityParams, ServerStats} from '../types';

export interface ServerRunOptions {
  port: number;
  resSize: number;
  securityParams: SecurityParams;
}

export interface ServerMarkOptions {
  reset?: boolean;
}

export interface ServerStatus {
  stats: ServerStats;
  port: number;
  cores?: number;
}

export interface WorkerService {
  run(opts: ServerRunOptions): Promise<ServerStatus>;

  mark(opts: ServerMarkOptions): Promise<ServerStatus>;

  cores(): Promise<{cores: number}>;
}
