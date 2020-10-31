import {expect} from '@loopback/testlab';
import {TCPClient} from '@remly/tcp';
import {AddressInfo} from 'net';
import findAvailablePort from 'get-port';
import {GreetingApplication} from '../application';
import {Greeting} from '../types';

describe('GreetingApplication', function () {
  let app: GreetingApplication;
  let client: TCPClient;

  before(givenRunningApplicationWithCustomConfiguration);
  after(async () => {
    await client?.end();
    await app.stop();
  });

  before(() => {
    const addr = app.server.address as AddressInfo;
    client = TCPClient.connect(addr.port, addr.address);
  });

  it('should get a greeting in English', async function () {
    const greeting = client.service<Greeting>();
    const result = await greeting.call('greet', ['en', 'Tom']);
    expect(result).equal('Hello, Tom!');
  });

  it('should get a greeting in Chinese', async function () {
    const greeting = client.service<Greeting>();
    const result = await greeting.call('greet', ['zh', '李雷']);
    expect(result).equal('李雷，你好！');
  });

  async function givenRunningApplicationWithCustomConfiguration() {
    app = new GreetingApplication({
      server: {
        port: await findAvailablePort(),
        host: '127.0.0.1',
      },
    });

    // Start Application
    await app.main();
  }
});
