import * as path from 'path';
import * as fs from 'fs';

export function fixturePath(...segs: string[]): string {
  return path.join(__dirname, '../fixtures', ...segs);
}

export function loadFixture(...segs: string[]): Buffer {
  return fs.readFileSync(fixturePath(...segs));
}
