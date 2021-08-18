export type Handler = (...args: any[]) => any;

export class Method {
  constructor(public handler: Handler, public scope?: any) {}

  invoke(args: any): Promise<any> {
    if (args == null) {
      args = [];
    } else if (!Array.isArray(args)) {
      args = [args];
    }
    return this.handler.call(this.scope, ...args);
  }
}
