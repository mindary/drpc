let _nextId = 0;

export function nextId(): number {
  return _nextId++;
}
