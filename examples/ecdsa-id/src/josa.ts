import {Signer} from '@libit/josa';
import {Serializer, ServerRequestHandler} from '@remly/server';

export interface JOSAMiddlewareOptions {
  signer: Signer;
  serializer: Serializer;
}

export function josa(options: JOSAMiddlewareOptions): ServerRequestHandler {
  const {signer} = options;
  return async (request, next) => {
    const {challenge} = request.socket;
    const {auth} = request.socket.metadata;
    if (auth?.sig) {
      const ticket = signer.unpackAndVerify(auth.sig);
      if (challenge.compare(ticket.payload) !== 0) {
        throw new Error('signature is invalid');
      }
      request.socket.id = ticket.identities[0];
    }
    return next();
  };
}
