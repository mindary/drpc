import {EventEmitter} from 'events';
import {IBenchmarkClient, ClientStats, SecurityParams} from '../../types';
import {Histogram, HistogramParams} from '../../histogram';
import https from 'https';
import fs from 'fs';
import http from 'http';
import PoissonProcess, {PoissonInstance} from 'poisson-process';
import {fixturePath, times} from '../../utils';
import {endpoint} from './endpoint';
import map from 'tily/array/map';
import assign from 'tily/assign';

export class RestBenchmarkClient extends EventEmitter implements IBenchmarkClient {
  histogram: Histogram;
  request: Function;
  clientOptions: any[];
  running: boolean;
  pendingCalls: number;
  lastWallTime: [number, number];
  lastUsage: NodeJS.CpuUsage;

  constructor(
    serverTargets: string[],
    channels: number,
    histogramParams: HistogramParams,
    securityParams: SecurityParams,
  ) {
    super();

    const options: Record<string, any> = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
    };
    let protocol: any;
    if (securityParams) {
      let caPath: string;
      protocol = https;
      this.request = https.request.bind(https);
      if (securityParams.useTestCa) {
        caPath = fixturePath('ca.pem');
        options.ca = fs.readFileSync(caPath);
      }
      if (securityParams.serverHostOverride) {
        options.servername = securityParams.serverHostOverride;
      }
    } else {
      protocol = http;
    }

    this.request = protocol.request.bind(protocol);

    this.clientOptions = [];

    for (let i = 0; i < channels; i++) {
      const target = serverTargets[i % serverTargets.length].split(':');
      this.clientOptions[i] = {hostname: target[0], port: +target[1], ...options};
    }

    this.histogram = new Histogram(histogramParams.resolution, histogramParams.maxPossible);

    this.running = false;

    this.pendingCalls = 0;
  }

  async startClosedLoop(rpcsPerChannel: number, method: string, reqSize: number, respSize: number) {
    const options: Record<string, any> = {};

    this.running = true;

    try {
      options.path = endpoint(method);
    } catch (e) {
      this.emit('error', e);
    }

    this.lastWallTime = process.hrtime();
    this.lastUsage = process.cpuUsage();

    const argument: Record<string, any> = {
      responseSize: respSize,
      payload: {
        body: '0'.repeat(reqSize),
      },
    };

    const makeCall = (clientOptions: Record<string, any>) => {
      if (this.running) {
        this.pendingCalls++;
        const startTime = process.hrtime();
        const finishCall = (success: boolean) => {
          if (success) {
            const timeDiff = process.hrtime(startTime);
            this.histogram.add(timeDiffToNanos(timeDiff));
          }
          makeCall(clientOptions);
          this.pendingCalls--;
          if (!this.running && this.pendingCalls === 0) {
            this.emit('finished');
          }
        };
        const req = this.request(clientOptions, (res: http.IncomingMessage) => {
          let resData = '';
          res.on('data', function (data) {
            resData += data;
          });
          res.on('end', function () {
            JSON.parse(resData);
            finishCall(true);
          });
        });
        req.write(JSON.stringify(argument));
        req.end();
        req.on('error', (error: any) => {
          if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
            finishCall(false);
            return;
          }
          this.emit('error', new Error('Client error: ' + error.message));
          this.running = false;
        });
      }
    };

    startAllClients(
      map(opts => assign(opts, options), this.clientOptions),
      rpcsPerChannel,
      makeCall,
    );
  }

  async startPoisson(rpcsPerChannel: number, method: string, reqSize: number, respSize: number, offeredLoad: number) {
    const options: Record<string, any> = {};

    this.running = true;

    options.path = endpoint(method);

    this.lastWallTime = process.hrtime();
    this.lastUsage = process.cpuUsage();

    const argument = {
      responseSize: respSize,
      payload: {
        body: '0'.repeat(reqSize),
      },
    };

    const makeCall = (clientOptions: Record<string, any>, poisson: PoissonInstance) => {
      if (this.running) {
        this.pendingCalls++;
        const startTime = process.hrtime();
        const req = this.request(clientOptions, (res: http.IncomingMessage) => {
          let resData = '';
          res.on('data', data => {
            resData += data;
          });
          res.on('end', () => {
            JSON.parse(resData);
            const timeDiff = process.hrtime(startTime);
            this.histogram.add(timeDiffToNanos(timeDiff));
            this.pendingCalls--;
            if (!this.running && this.pendingCalls === 0) {
              this.emit('finished');
            }
          });
        });
        req.write(JSON.stringify(argument));
        req.end();
        req.on('error', (error: any) => {
          this.emit('error', new Error('Client error: ' + error.message));
          this.running = false;
        });
      } else {
        poisson.stop();
      }
    };

    const averageIntervalMs = (1 / offeredLoad) * 1000;

    startAllClients(
      map(opts => assign(opts, options), this.clientOptions),
      rpcsPerChannel,
      (opts: Record<string, any>) => {
        const p = PoissonProcess.create(averageIntervalMs, function () {
          makeCall(opts, p);
        });
        p.start();
      },
    );
  }

  mark(reset?: boolean): ClientStats {
    const wallTimeDiff = process.hrtime(this.lastWallTime);
    const usageDiff = process.cpuUsage(this.lastUsage);
    const histogram = this.histogram;
    if (reset) {
      this.lastWallTime = process.hrtime();
      this.lastUsage = process.cpuUsage();
      this.histogram = new Histogram(histogram.resolution, histogram.maxPossible);
    }

    return {
      latencies: {
        bucket: histogram.getContents(),
        minSeen: histogram.minimum(),
        maxSeen: histogram.maximum(),
        sum: histogram.getSum(),
        sumOfSquares: histogram.getSumOfSquares(),
        count: histogram.getCount(),
      },
      elapsed: wallTimeDiff[0] + wallTimeDiff[1] / 1e9,
      user: usageDiff.user / 1000000,
      system: usageDiff.system / 1000000,
    };
  }
}

function startAllClients(clientOptionsList: any[], outstandingRpcsPerChannel: number, fn: Function) {
  for (const clientOptions of clientOptionsList) {
    times(outstandingRpcsPerChannel, () => fn(clientOptions));
  }
}

/**
 * Convert a time difference, as returned by process.hrtime, to a number of
 * nanoseconds.
 * @param {Array.<number>} timeDiff The time diff, represented as
 *     [seconds, nanoseconds]
 * @return {number} The total number of nanoseconds
 */
function timeDiffToNanos(timeDiff: [number, number]) {
  return timeDiff[0] * 1e9 + timeDiff[1];
}
