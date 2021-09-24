import {HistogramParams} from './histogram';

export interface SecurityParams {
  useTestCa: boolean;
  serverHostOverride: string;
}

export interface ServerStats {
  elapsed: number;
  user: number;
  system: number;
}

export interface IBenchmarkServerCtor {
  new (host: string, port: number, tls: boolean, responseSize: number): IBenchmarkServer;
}

export interface IBenchmarkServer {
  start(): Promise<void>;

  stop(): Promise<void>;

  getPort(): number;

  mark(reset?: boolean): ServerStats;
}

export interface ClientStats extends ServerStats {
  latencies: {
    bucket: number[];
    minSeen: number;
    maxSeen: number;
    sum: number;
    sumOfSquares: number;
    count: number;
  };
}

export interface IBenchmarkClientCtor {
  new (
    serverTargets: string[],
    channels: number,
    histogramParams: HistogramParams,
    securityParams: SecurityParams,
  ): IBenchmarkClient;
}

export interface IBenchmarkClient {
  startClosedLoop(rpcsPerChannel: number, method: string, reqSize: number, respSize: number): Promise<void>;

  startPoisson(
    rpcsPerChannel: number,
    method: string,
    reqSize: number,
    respSize: number,
    offeredLoad: number,
  ): Promise<void>;

  mark(reset?: boolean): ClientStats;
}
