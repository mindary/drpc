# remly

An efficient RPC protocol for multiple transports such as TCP, WebSocket, Worker and so on.

## Usage

### TCP Channel

```ts
// greeter.definition.ts
export const Greeter = {
  name: 'greeter',
  methods: {
    greet: {} as (name: strting) => string,
  },
};
```

```ts
// main.ts
import {Application} from '@remly/server';
import {TCPServer} from '@remly/tcp';
import {TCPClient} from '@remly/tcp-client';
import {Greeter} from './greeter.definition';

async function main() {
  // *******************
  // Setup Server
  // *******************
  // prepare applicaiton
  const remapp = new Application();
  // register all methods of the service with '*' name filter
  remapp.register(Greeter.name, {greet: name => `Hello, ${name}!`}, '*');
  // signal every client on connected
  remapp.on('connection', async connection => {
    await connection.signal('message', 'Welcome');
  });

  // setup server (tcp, websocket or worker)
  const server = new TCPServer(remapp, {
    port: 3000,
  });
  await server.start();

  // *******************
  // Setup Client
  // *******************
  const client = TCPClient.connect(3000);
  // subscribe "message" signal
  client.remote.on('message', message => {
    console.log(message); // => Welcome
  });
  const service = client.remote.service(Greeter);
  // call remote method
  const result = await service.greet('Tom');
  console.log(result);

  await client.end();
  await server.stop();

  // =>
  // Welcome
  // Hello, Tom!
}

main().catch(err => {
  console.log(err);
  process.exit(1);
});
```

## Specification

See `spec.md`.

## Licence

- Copyright (c) 2021, Yuan Tao (MIT License).
