import {Constructor, ValueOrPromise} from '@remly/types';
import {Emittery} from '@libit/emittery';
import {Transport} from '@remly/core';
import {Application} from './application';
import {AddressInfo} from 'net';

export interface ServerEvents {
  transport: Transport;
}

export interface ServerChannelOptions {
  name?: string;
}

export abstract class Server<
  O extends ServerChannelOptions = ServerChannelOptions,
  EVENTS = ServerEvents,
> extends Emittery<EVENTS & ServerEvents> {
  public name: string;
  protected _options: Readonly<Required<O>>;

  protected constructor(options?: O);
  protected constructor(app?: Application, options?: O);
  protected constructor(appOrOptions?: Application | O, options?: O) {
    super();

    if (appOrOptions instanceof Application) {
      appOrOptions.bind(this);
    } else {
      options = appOrOptions;
    }

    this._options = this.configure(options);
    if (this.options.name) {
      this.name = this.options.name;
    }
  }

  get defaultOptions(): Partial<O> {
    return {};
  }

  get options(): Readonly<Required<O>> {
    return this._options;
  }

  abstract get address(): AddressInfo | string | null | undefined;

  /**
   * Set an options object by merging the new partial and existing options
   * with the defined blueprint, while running all validation checks.
   * Freeze and return the options object.
   */
  configure(options?: Partial<O> | ((options: Required<O>) => Partial<O>)): Readonly<Required<O>> {
    if (!this._options) {
      this._options = Object.freeze({...this.defaultOptions} as any);
    }
    const nextOptions = typeof options === 'function' ? options(this._options) : options;
    this._options = Object.freeze({...this._options, ...nextOptions});
    return this._options;
  }

  abstract start(): ValueOrPromise<any>;

  abstract stop(): ValueOrPromise<any>;
}

export type ServerClass<T extends Server = Server> = Constructor<T>;
