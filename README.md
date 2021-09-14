# drpc

An efficient RPC protocol for multiple transports such as TCP, WebSocket, Worker and so on.

## Usage

### TCP transport

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
// declare we have @drpc/transport-tcp for app.accept().
import '@drpc/transport-tcp';

import {Application, tcp} from '@drpc/server';

// *******************
// Definitions
// *******************
// definition style 1
class Greeter {
  // or define a const string
  static namespace: 'greeter';

  greet: (name: string) => string;
}

// definition style 2
const GreeterNamespace = 'greeter';

interface Greeter {
  greet: (name: string) => string;
}

// *******************
// Implementations
// *******************
@drpc(Greeter.namespace)
class GreeterImpl implements Greeter {
  @drpc.method()
  greet(name: string) {
    return `Hello, ${name}!`;
  }
}

// server initiation
const greeter = new GreeterImpl();

async function main() {
  // *******************
  // Setup Server
  // *******************
  // prepare applicaiton
  const app = new Application();

  // register all methods of the service with '*' name filter
  app.register(Greeter.namespace, greeter, '*');
  // or according to decorators
  // app.register(greeter);

  // signal every client on connected
  app.on('connection', async connection => {
    await connection.emit('message', 'Welcome');
  });

  // setup server (tcp, websocket or worker)
  const server = net.createServer(app.accept());
  server.listen(3000);

  // *******************
  // Setup Client
  // *******************
  const client = connect('tcp://localhost:3000');
  // subscribe "message" signal
  client.on('message', message => {
    console.log(message); // => Welcome
  });
  const service = client.service<Greeter>(Greeter.namespace);
  // call remote method
  const result = await service.call('greet', ['Tom']);
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

## Licence

- Copyright (c) 2021, Yuan Tao (MIT License).
