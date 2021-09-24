import express, {Request, Response} from 'express';
import fs from 'fs';
import https, {ServerOptions} from 'https';
import http from 'http';
import bodyParser from 'body-parser';
import {EventEmitter} from 'events';
import {IBenchmarkServer, ServerStats} from '../../types';
import {AddressInfo} from 'net';
import {fromCallback} from 'a-callback';
import {fixturePath} from '../../utils';

export class RestBenchmarkServer extends EventEmitter implements IBenchmarkServer {
  server: http.Server;

  lastWallTime: [number, number];
  lastUsage: NodeJS.CpuUsage;

  constructor(public host: string, public port: number, tls: boolean) {
    super();
    const app = express();
    app.use(bodyParser.json());
    app.put('/rest/benchmark/unary', unary);
    if (tls) {
      const httpsOptions: ServerOptions = {};
      const keyPath = fixturePath('server1.key');
      const pemPath = fixturePath('server1.pem');

      const keyData = fs.readFileSync(keyPath);
      const pemData = fs.readFileSync(pemPath);
      httpsOptions['key'] = keyData;
      httpsOptions['cert'] = pemData;
      this.server = https.createServer(httpsOptions, app);
    } else {
      this.server = http.createServer(app);
    }
  }

  async start(): Promise<void> {
    return fromCallback(cb =>
      this.server.listen(this.port, this.host, () => {
        this.lastWallTime = process.hrtime();
        this.lastUsage = process.cpuUsage();
        this.emit('started');
        cb();
      }),
    );
  }

  stop(): Promise<void> {
    return fromCallback(cb => this.server.close(cb));
  }

  getPort(): number {
    return (this.server.address() as AddressInfo).port;
  }

  mark(reset: boolean): ServerStats {
    const wallTimeDiff = process.hrtime(this.lastWallTime);
    const usageDiff = process.cpuUsage(this.lastUsage);
    if (reset) {
      this.lastWallTime = process.hrtime();
      this.lastUsage = process.cpuUsage();
    }
    return {
      elapsed: wallTimeDiff[0] + wallTimeDiff[1] / 1e9,
      user: usageDiff.user / 1000000,
      system: usageDiff.system / 1000000,
    };
  }
}

function unary(req: Request, res: Response) {
  res.json({body: '0'.repeat(req.body.responseSize)});
}
