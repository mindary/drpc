import path from 'path';

export function fixturePath(...pathSegments: string[]) {
  return path.join(__dirname, 'fixtures', ...pathSegments);
}
