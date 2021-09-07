const {Suite} = require('benchmark');
const {packer} = require('..');

function run() {
  const packet = {
    type: 'call',
    metadata: {
      foo: 'bar',
    },
    message: {
      id: 1234,
      name: 'greet',
      payload: 'Hello',
    },
  };
  const data = packer.pack(packet.type, packet.message, packet.metadata);

  const suite = new Suite('Packer');
  suite
    .add('pack', () => {
      packer.pack(packet.type, packet.message, packet.metadata);
    })
    .add('unpack', () => {
      packer.unpack(data);
    })
    .on('error', error => console.error(error))
    .on('cycle', function (event) {
      console.log(String(event.target));
    })
    .on('complete', function () {
      console.log('Fastest is ' + suite.filter('fastest').map('name'));
    })
    .run({async: false});
}

run();
