import {program} from '@caporal/core';
import {inspect} from 'util';
import {run} from './worker';
import {AddressInfo} from 'net';

Error.stackTraceLimit = Infinity;

async function cli() {
  program
    .version(require('../package.json').version)
    .option('-p, --port <port>', 'Specify a port', {
      global: true,
      default: 10000,
      validator: program.NUMBER,
    })
    .option('-d, --provider <provider>', 'Specify the provider', {
      validator: ['drpc', 'grpc', 'rest'],
      required: true,
    })
    .action(async ({logger, args, options}) => {
      console.log('run with options =>\n', inspect(options));
      const server = await run(options.port as number, options.provider as string);
      const port = (server.address() as AddressInfo).port;
      console.log(`Started on port ${port}`);
    });

  await program.run();
}

cli().catch(console.error);
