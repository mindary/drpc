import {expect, sinon} from '@loopback/testlab';
import {createServerChannel} from '../../factory';
import {BaseServer} from '../fixtures/base-server';

class ThrowingServer extends BaseServer {
  constructor() {
    super();
    throw new Error('expected test error');
  }
}

describe('channel factory', () => {
  let consoleWarnStub: sinon.SinonStub;

  beforeEach(() => {
    consoleWarnStub = sinon.stub(console, 'warn');
  });

  afterEach(() => {
    consoleWarnStub.restore();
  });

  it('reports helpful error when channel initiation throws', function () {
    expect(() =>
      createServerChannel({
        name: 'remly-channel-throwing',
        channel: ThrowingServer,
      }),
    ).throw(/remly-channel-throwing/);
  });

  it('reports helpful error when channel initiation via short name throws', function () {
    expect(() =>
      createServerChannel({
        name: 'chname',
        channel: 'throwing',
      }),
    ).throw(/expected test error/);
  });

  it('reports helpful error when channel initiation via long name throws', function () {
    expect(() =>
      createServerChannel({
        name: 'chname',
        channel: 'remly-channel-throwing',
      }),
    ).throw(/expected test error/);
  });

  /**
   * createServerChannel(chName, settings) without settings.name
   */
  it('should retain the name assigned to it', function () {
    const server = createServerChannel('myServerChannel', {
      channel: 'tcp',
    });

    expect(server.name).equal('myServerChannel');
  });

  /**
   * createServerChannel(chName, settings)
   */
  it('should allow the name assigned to it to take precedence over the settings name', function () {
    const server = createServerChannel('myServerChannel', {
      name: 'defaultServerChannel',
      channel: 'tcp',
    });

    expect(server.name).equal('myServerChannel');
  });

  /**
   * createServerChannel(settings) with settings.name
   */
  it('should retain the name from the settings if no name is assigned', function () {
    const server = createServerChannel({
      name: 'defaultServerChannel',
      channel: 'tcp',
    });

    expect(server.name).equal('defaultServerChannel');
  });

  /**
   * createServerChannel(undefined, settings)
   */
  it('should retain the name from the settings if name is undefined', function () {
    const server = createServerChannel(undefined, {
      name: 'defaultServerChannel',
      channel: 'tcp',
    });

    expect(server.name).equal('defaultServerChannel');
  });

  /**
   * createServerChannel(settings) without settings.name
   */
  it('should use the channel name if no name is provided', function () {
    const server = createServerChannel({
      channel: 'tcp',
    });

    expect(server.name).equal('tcp');
  });
});
