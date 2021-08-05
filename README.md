# remly

A binary-only RPC protocol for multiple transports such as TCP, WebSocket, Worker and so on.

## Usage

### TCPServer and TCPClient

```js
import {Application} from '@remly/core';
import {TCPServer} from '@remly/tcp';
import {TCPClient} from '@remly/tcp-client';

(async () => {
  // *******************
  // Setup Server
  // *******************
  // prepare applicaiton
  const remapp = new Application();
  // register a server method
  remapp.register('greet', name => `Hello, ${name}!`);
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
  client.subscribe('message', message => {
    console.log(message); // => Welcome
  });
  // call remote server method
  const result = await client.call('greet', ['Tom']);
  console.log(result);

  await client.end();
  await server.stop();

  // =>
  // Welcome
  // Hello, Tom!
})();
```

## Why?

Most websocket-based protocols use JSON. JSON is big and slow. In many cases when needing to send binary data over a
conventional websocket protocol, the programmer is forced to use hex strings inside the JSON serialization. This is
inefficient.

Furthermore, most event-based abstractions on top of websockets introduce an enormous amount of bloat due to the
inclusion of fallback transports (xhr, long-polling, etc) as well as even higher level abstractions (channels).

Remly works only with binary data and gives you a simple event based interface without anything else. No channels, no
fallback, no complicated handshakes or feature testing over HTTP.

## Specification

See `spec.md`.

## Licence

- Copyright (c) 2020, Yuan Tao (MIT License).
- Copyright (c) 2017, Christopher Jeffrey (MIT License).
