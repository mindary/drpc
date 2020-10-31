import {expect} from '@loopback/testlab';

export function assertNear(real: number, expected: number, diff = 0) {
  expect(Math.abs(real - expected)).lessThanOrEqual(diff, `${real} should be near ${expected} max diff ${diff}`);
}
