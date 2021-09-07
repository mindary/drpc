import {ApplicationOptions, ApplicationWithRegistry} from '@drpc/server';
import {Signer} from '@libit/josa';
import {greeting} from './services/greeting.service';

export class EcdsaApplication extends ApplicationWithRegistry {
  signer: Signer;

  constructor(options?: ApplicationOptions) {
    super(options);

    this.on('error', console.error);

    this.register(greeting);

    this.signer = new Signer();

    this.addConnectInterceptor(async (carrier, next) => {
      const id = carrier.message.clientId;
      if (!id) {
        throw new Error('clientId is required');
      }

      const [auth] = carrier.get('auth') as string[];
      if (!auth?.startsWith('ecdsa')) {
        throw new Error('only ecdsa authentication allowed');
      }

      return next();
    });

    this.addIncomingInterceptor(async (carrier, next) => {
      const [sig] = carrier.get('sig-bin');
      const ticket = this.signer.unpackAndVerify(sig as Buffer);
      if (!ticket.identities.includes(carrier.socket.id)) {
        throw new Error('identity in signature is not match with clientId');
      }
      if (!carrier.socket.nonce || carrier.socket.nonce.compare(ticket.payload) !== 0) {
        throw new Error('signature is invalid');
      }
      return next();
    });
  }
}
