export type Handler = (...args: any[]) => any;

export type Arg = string | number | boolean | null | undefined | object;
export type Args = Arg | Arg[];

export interface MethodOptions {
  namespace: string;
  owner: Object;
  name: string;
}

export class Method {
  readonly namespace?: string;
  readonly name?: string;
  readonly target?: object;

  readonly owner?: Object;

  constructor(public handler: Handler, options?: MethodOptions) {
    this.namespace = options?.namespace;
    this.owner = options?.owner;
    this.name = options?.name;

    if (this.owner && this.name) {
      this.target = Object.prototype.hasOwnProperty.call(this.owner, this.name)
        ? this.owner
        : Object.getPrototypeOf(this.owner);
    }
  }

  call(args: Args): Promise<any> {
    if (args == null) {
      args = [];
    } else if (!Array.isArray(args)) {
      args = [args];
    }
    return this.handler.call(this.owner, ...args);
  }

  invoke(args: Args): Promise<any> {
    return this.call(args);
  }
}
