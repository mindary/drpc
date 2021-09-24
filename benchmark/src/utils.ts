import * as path from 'path';

export function fixturePath(...pathSegments: string[]) {
  return path.resolve(__dirname, '../fixtures', ...pathSegments);
}

export function loadProvider(name: string) {
  return require(path.resolve(__dirname, 'providers', name));
}

export function times(num: number, fn: () => any) {
  for (let i = 0; i < num; i++) {
    fn();
  }
}
