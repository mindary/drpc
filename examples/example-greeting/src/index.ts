import {GreetingApplication} from './application';

export async function main() {
  const config = {
    server: {
      port: +(process.env.PORT ?? 3000),
      host: process.env.HOST ?? '127.0.0.1',
    },
  };
  const app = new GreetingApplication(config);
  await app.main();
  const addr = app.server.address;
  console.log(`The service is running at ${addr}`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('Cannot start the application.', err);
    process.exit(1);
  });
}
