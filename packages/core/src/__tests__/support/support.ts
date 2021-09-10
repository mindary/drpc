import {random} from '../../utils';

export function createNoop() {
  return async () => {};
}

export function randomId() {
  return random().toString('hex');
}
