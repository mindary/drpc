import {AsyncOrSync} from 'ts-essentials';

export type Constructor<T> = new (...args: any[]) => T;

export type EventName = string | symbol;

export type SignalName = string | symbol;

export type SignalHandler = (...args: any[]) => AsyncOrSync<any>;

export type ExposeMetadata = {
  alias?: string;
};
