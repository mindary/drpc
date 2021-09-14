import {Application, ApplicationOptions} from '@drpc/server';
import {Signer} from '@libit/josa';
import {greeting} from './services/greeting.service';
import {RegistryMixin} from '@drpc/registry';
import {MetadataKeys, random} from '@drpc/core';

export class EcdsaApplication extends RegistryMixin(Application) {
  signer: Signer;

  constructor(options?: ApplicationOptions) {
    super(options);

    this.on('error', console.error);

    this.register(greeting);

    this.signer = new Signer();

    this.addAuthInterceptor(async carrier => {
      const {socket} = carrier;
      const [authmethod] = carrier.getAsString(MetadataKeys.AUTH_METHOD);

      if (!authmethod?.startsWith('ecdsa')) {
        throw new Error('only ecdsa authentication allowed');
      }

      if (!socket.session.nonce) {
        // authentication stage 1
        // generate challenge
        const data = (socket.session.nonce = random(32));
        carrier.set('authdata', data);
        carrier.set(MetadataKeys.AUTH_METHOD, 'ecdsa');
        carrier.respond = 'auth';
      } else {
        // authentication stage 2
        const [data] = carrier.getAsBuffer('authdata');
        const ticket = this.signer.unpackAndVerify(data);
        // check identity
        if (!ticket.identities.includes(socket.id)) {
          throw new Error('identity in signature is not match with clientId');
        }
        // validate signature
        if (!socket.session.nonce || socket.session.nonce.compare(ticket.payload) !== 0) {
          throw new Error('signature is invalid');
        }
      }
    });
  }
}
