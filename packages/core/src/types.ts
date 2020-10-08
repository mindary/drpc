export type Constructor<T> = new (...args: any[]) => T;

export type EventName = string | symbol;

export type EventHandler = (...args: any[]) => void;
