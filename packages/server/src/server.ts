import {ValueOrPromise} from '@remly/types';
import {Emittery} from '@libit/emittery';
import {Transport} from '@remly/core';
import {Application} from './application';

export interface ServerEvents {
  transport: Transport;
}

export abstract class Server<O extends object = {}, EVENTS = ServerEvents> extends Emittery<EVENTS & ServerEvents> {
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
  }

  get defaultOptions(): Partial<O> {
    return {};
  }

  get options(): Readonly<Required<O>> {
    return this._options;
  }

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