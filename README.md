# remly

A binary-only RPC protocol for multiple transports such as TCP, WebSocket, Worker and so on.

## Usage

### TCPServer and TCPClient

```js
const {TCPServer, TCPClient} = require('@remly/tcp');

(async () => {
  const server = TCPServer.createServer({
    port: 3000,
  });
  server.register('greet', name => `Hello, ${name}!`);
  server.on('connection', connection => {
    // eslint-disable-next-line no-void
    void connection.signal('message', 'Welcome');
  });
  await server.start();

  const client = TCPClient.connect(3000);
  client.listen('message', message => {
    console.log(message);
  });
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
