export default class ThrowingServer {
  constructor() {
    throw new Error('expected test error');
  }
}
