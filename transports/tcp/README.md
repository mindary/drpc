# @remly/tcp

> The remly TCP transport

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
    connection.signal('message', 'Welcome').catch(console.error);
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
