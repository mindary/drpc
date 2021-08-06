import {ApplicationOptions, TCPServer, TCPServerOptions} from '@remly/tcp';
import {ECDSAApplication} from './application';

export async function main(options: ApplicationOptions & TCPServerOptions = {}) {
  const app = new ECDSAApplication(options);
  const server = new TCPServer(app, options);
  await server.start();
  console.log('server started on', server.address);
  return server;
}

if (require.main === module) {
  const options = {
    port: 3000,
  };
  main(options).catch(err => {
    console.error('Cannot start the application.', err);
    process.exit(1);
  });
}
