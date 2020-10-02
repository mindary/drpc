import {RPC} from '../..';
import {MockTransport} from '../mocks/mock-transport';

export function fixture(name: string): string {
  return require.resolve('./fixtures/' + name);
}

export function throwError(err: Error) {
  throw err;
}

export async function repeat(times: number, fn: Function) {
  const arr = new Array(times).fill(0);
  return Promise.all(arr.map(() => fn()));
}

export function givenAPairOfRPCWithMockChannel(m: {[name: string]: Function}) {
  const st = new MockTransport();
  const ct = new MockTransport();
  st.pipe(ct).pipe(st);

  const server = RPC.create(st);
  const client = RPC.create(ct);

  server.methods(m);

  return {server, client};
}
