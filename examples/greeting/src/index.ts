import {setupServer} from './server';
import {ServerOpts} from 'net';
import {GreetingApplication} from './application';

export async function main(opts: ServerOpts & {port?: number}) {
  const app = new GreetingApplication(opts);
  await setupServer(app, opts);
  console.log('The service is running');
}

if (require.main === module) {
  // Run the application
  const config = {
    port: +(process.env.PORT ?? 3000),
    host: process.env.HOST ?? 'localhost',
  };
  main(config).catch(err => {
    console.error('Cannot start the application.', err);
    process.exit(1);
  });
}
