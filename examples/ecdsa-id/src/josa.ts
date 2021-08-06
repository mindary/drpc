import {Signer} from '@libit/josa';
import {MiddlewareInterceptor, Serializer} from '@remly/server';

export interface JOSAMiddlewareOptions {
  signer: Signer;
  serializer: Serializer;
}

export function josa(options: JOSAMiddlewareOptions): MiddlewareInterceptor {
  const {signer} = options;
  return async ({connection}, next) => {
    const {auth, challenge} = connection.handshake;
    if (auth.sig) {
      const ticket = signer.unpackAndVerify(auth.sig);
      if (challenge.compare(ticket.payload) !== 0) {
        throw new Error('signature is invalid');
      }
      connection.id = ticket.identities[0];
    }
    return next();
  };
}
