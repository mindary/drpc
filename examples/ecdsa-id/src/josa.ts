import {Signer} from '@libit/josa';
import {Serializer, ServerConnectHandler} from '@remly/server';

export interface JOSAMiddlewareOptions {
  signer: Signer;
  serializer: Serializer;
}

export function josa(options: JOSAMiddlewareOptions): ServerConnectHandler {
  const {signer} = options;
  return async (context, next) => {
    const {challenge} = context.socket;
    const {auth} = context.socket.metadata;
    if (auth?.sig) {
      const ticket = signer.unpackAndVerify(auth.sig);
      if (challenge.compare(ticket.payload) !== 0) {
        throw new Error('signature is invalid');
      }
      context.socket.id = ticket.identities[0];
    }
    return next();
  };
}
