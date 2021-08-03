import {nonce} from '../../utils';

export function createNoop() {
  return async () => {};
}

export function randomId() {
  return nonce().toString('hex');
}
