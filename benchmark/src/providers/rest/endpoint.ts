const endpoints: Record<string, any> = {
  unary: '/rest/benchmark/unary',
};

export function endpoint(method: string): string {
  const uri = endpoints[method];
  if (!uri) {
    new Error('Unsupported method: ' + method);
  }
  return uri;
}
