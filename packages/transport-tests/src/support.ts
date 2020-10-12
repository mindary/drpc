import {Server} from '@remly/server';

export async function waitForConnection(server: Server<any>) {
  const [connection] = Object.values(server.connections);
  return connection ? connection : server.once('connection');
}

export async function asyncFromCallback(fn: (err: any, data?: any) => void) {
  return new Promise((resolve, reject) => {
    fn((err: any, data?: any) => {
      if (err) {
        return reject(err);
      }
      resolve(data);
    });
  });
}
