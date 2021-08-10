import {expect} from '@loopback/testlab';
import {createServerChannel} from '../../factory';
import {BaseServer} from '../fixtures/base-server';

class ThrowingServer extends BaseServer {
  constructor() {
    super();
    throw new Error('expected test error');
  }
}

describe('channel factory', () => {
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

  // /**
  //  * createServerChannel(dsName, settings) without settings.name
  //  */
  // it('should retain the name assigned to it', function () {
  //   const server = createServerChannel('myServerChannel', {
  //     channel: 'tcp',
  //   });
  //
  //   expect(server.name).equal('myServerChannel');
  // });

  // /**
  //  * createServerChannel(dsName, settings)
  //  */
  // it('should allow the name assigned to it to take precedence over the settings name', function() {
  //   const dataSource = createServerChannel('myServerChannel', {
  //     name: 'defaultServerChannel',
  //     channel: 'memory',
  //   });
  //
  //   dataSource.name.should.equal('myServerChannel');
  // });
  //
  // /**
  //  * createServerChannel(settings) with settings.name
  //  */
  // it('should retain the name from the settings if no name is assigned', function() {
  //   const dataSource = createServerChannel({
  //     name: 'defaultServerChannel',
  //     channel: 'memory',
  //   });
  //
  //   dataSource.name.should.equal('defaultServerChannel');
  // });
  //
  // /**
  //  * createServerChannel(undefined, settings)
  //  */
  // it('should retain the name from the settings if name is undefined', function() {
  //   const dataSource = createServerChannel(undefined, {
  //     name: 'defaultServerChannel',
  //     channel: 'memory',
  //   });
  //
  //   dataSource.name.should.equal('defaultServerChannel');
  // });
  //
  // /**
  //  * createServerChannel(settings) without settings.name
  //  */
  // it('should use the channel name if no name is provided', function() {
  //   const dataSource = createServerChannel({
  //     channel: 'memory',
  //   });
  //
  //   dataSource.name.should.equal('memory');
  // });
  //
  // /**
  //  * createServerChannel(channelInstance)
  //  */
  // it('should accept resolved channel', function() {
  //   const mockConnector = {
  //     name: 'remly-channel-mock',
  //     initialize: function(ds, cb) {
  //       ds.channel = mockConnector;
  //       return cb(null);
  //     },
  //   };
  //   const dataSource = createServerChannel(mockConnector);
  //
  //   dataSource.name.should.equal('remly-channel-mock');
  //   dataSource.channel.should.equal(mockConnector);
  // });
  //
  // /**
  //  * createServerChannel(dsName, channelInstance)
  //  */
  // it('should accept dsName and resolved channel', function() {
  //   const mockConnector = {
  //     name: 'remly-channel-mock',
  //     initialize: function(ds, cb) {
  //       ds.channel = mockConnector;
  //       return cb(null);
  //     },
  //   };
  //   const dataSource = createServerChannel('myServerChannel', mockConnector);
  //
  //   dataSource.name.should.equal('myServerChannel');
  //   dataSource.channel.should.equal(mockConnector);
  // });
  //
  // /**
  //  * createServerChannel(channelInstance, settings)
  //  */
  // it('should accept resolved channel and settings', function() {
  //   const mockConnector = {
  //     name: 'remly-channel-mock',
  //     initialize: function(ds, cb) {
  //       ds.channel = mockConnector;
  //       return cb(null);
  //     },
  //   };
  //   const dataSource = createServerChannel(mockConnector, {name: 'myServerChannel'});
  //
  //   dataSource.name.should.equal('myServerChannel');
  //   dataSource.channel.should.equal(mockConnector);
  // });
});
