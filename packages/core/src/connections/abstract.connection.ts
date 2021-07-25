import {assert, AsyncOrSync} from 'ts-essentials';
import {Emittery} from '@mindary/emittery';
import shortid from 'shortid';
import aDefer, {DeferredPromise} from 'a-defer';
import {getTime} from '@remly/schedule';
import {JsonSerializer, Raw, Serializer} from '@remly/serializer';
import {Packet} from '../packet';
import * as utils from '../utils';
import {rawLength, readBinary} from '../utils';
import {InvalidParamsError, makeRemError, RemError, TimeoutError, UnknownError} from '../error';
import {DefaultParser, Parser} from '../parsers';
import {InvokeFn} from '../types';
import {ConnectionOptions} from './types';

const debug = require('debug')('remly:connection');
const DUMMY = Buffer.alloc(0);

export interface Job {
  timeout: number;
  ts: number;

  resolve(value?: any): void;

  reject(value?: any): void;
}

export interface NoJob {
  type: 'ack' | 'error';
  id: number;
}

export type ConnectionEventData = {
  error: Error;
  /**
   * Triggered when a response is received and the corresponding job has timed out or expired.
   */
  nojob: NoJob;
  open: undefined;
  close: undefined;
};

const DEFAULT_KEEPALIVE = 30 * 1000;
const DEFAULT_STALL_INTERVAL = 5 * 1000;
const DEFAULT_REQUEST_TIMEOUT = 10 * 1000;
const DEFAULT_CONNECT_TIMEOUT = 10 * 1000;

/**
 * Connection
 * @constructor
 * @ignore
 */
export class AbstractConnection extends Emittery<ConnectionEventData> {
  public options: ConnectionOptions & Record<string, any>;
  public invoke?: InvokeFn;

  public readonly parser: Parser;
  public readonly serializer: Serializer;
  public readonly interval: number;
  public readonly requestTimeout: number;
  public readonly connectTimeout: number;
  protected readonly remoteEmittery: Emittery;

  protected _ready: DeferredPromise<void>;
  protected _timer?: any;
  protected _challenge?: Buffer;
  protected _lastActive = 0;
  protected _jobs: Record<string, Job>;
  protected _start: number;
  protected _sequence: number;
  protected _aliveTimeout: number;

  constructor(options: ConnectionOptions = {}) {
    super();
    this.options = options;
    this._id = options?.id ?? 'remly_' + shortid();
    this.remoteEmittery = new Emittery();

    this.parser = options?.parser ?? new DefaultParser();
    this.serializer = options?.serializer ?? new JsonSerializer();

    this.interval = options?.interval ?? DEFAULT_STALL_INTERVAL;
    this.requestTimeout = options?.requestTimeout ?? DEFAULT_REQUEST_TIMEOUT;
    this.connectTimeout = options?.connectTimeout ?? DEFAULT_CONNECT_TIMEOUT;

    this.invoke = options?.invoke;

    this.setKeepAlive(options?.keepalive ?? DEFAULT_KEEPALIVE);

    assert(
      this.requestTimeout > this.interval,
      `requestTimeout(${this.requestTimeout}ms) must be greater than stallInterval(${this.interval}ms)`,
    );
    assert(
      this.connectTimeout > this.interval,
      `connectTimeout(${this.connectTimeout}ms) must be greater than stallInterval(${this.interval}ms)`,
    );

    this.reset();
  }

  protected _id: string;

  get id() {
    return this._id;
  }

  protected _connected: boolean;

  get connected() {
    return this._connected;
  }

  protected _ended: boolean;

  get ended() {
    return this._ended;
  }

  protected _ending: boolean;

  get ending() {
    return this._ending;
  }

  protected _keepalive: number;

  get keepalive() {
    return this._keepalive;
  }

  setKeepAlive(keepalive: number) {
    if (keepalive < this.interval) {
      keepalive = this.interval;
    }
    this._keepalive = keepalive;
    this._aliveTimeout = keepalive * 1.5;
  }

  async ready(): Promise<void> {
    if (this._ending) {
      throw new Error('connection is ending');
    }

    if (this._ended) {
      throw new Error('connection already ended');
    }

    return (this._ready = this._ready ?? aDefer<void>());
  }

  async feed(data: any) {
    return this.parser.feed(await readBinary(data));
  }

  async end() {
    if (this._ended || this._ending) {
      return;
    }
    this._ending = true;

    const jobs = this._jobs;
    const keys = Object.keys(jobs);

    debug(this.id, 'end');
    await this.close();
    this.stopStall();

    this._connected = false;
    this._challenge = undefined;
    this._ending = false;
    this._ended = true;

    this._jobs = {};

    for (const key of keys) {
      jobs[key].reject(new Error('Connection was destroyed.'));
    }

    await this.emit('close');
  }

  protected bind(): void {
    throw new Error('Not implemented');
  }

  protected close(): AsyncOrSync<any> {
    throw new Error('Not implemented');
  }

  protected send(packet: Packet): AsyncOrSync<any> {
    throw new Error('Not implemented');
  }

  protected reset() {
    this.remoteEmittery.clearListeners();
    this._jobs = {};
    this._start = 0;
    this._sequence = 0;
    this._connected = false;
    this._ended = false;
    this._ready = aDefer<void>();
  }

  protected init() {
    debug(this.id, 'init');
    assert(this.parser, '`parser` is required, but not provide');
    this._start = Date.now();

    this.bind();
    this.parser.on('error', async (err: any) => {
      await this.error(err);
      await this.end();
    });

    this.parser.on('message', async packet => {
      try {
        await this.handleMessage(packet);
      } catch (e) {
        try {
          await this.sendError(packet.id, new UnknownError());
        } catch (_) {
          //
        }
        await this.error(e);
        await this.end();
      }
    });

    this.startStall();
  }

  protected async doConnected() {
    debug(this.id, 'doConnected');
    this._connected = true;
    this._ready.resolve();

    this.onConnected();

    await this.emit('open');
  }

  protected onConnected() {
    // for inheritance
  }

  protected serialize(data: any) {
    return data == null ? DUMMY : this.serializer.serialize(data);
  }

  protected deserialize(raw?: Raw) {
    return rawLength(raw) > 0 ? this.serializer.deserialize(raw!) : undefined;
  }

  protected startStall() {
    debug('startStall');
    assert(this._timer == null, 'already start stall');
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    this._timer = setInterval(async () => this.maybeStall(), this.interval);
  }

  protected stopStall() {
    debug('stopStall');
    assert(this._timer != null, 'stall has not been started');
    clearInterval(this._timer);
    this._timer = undefined;
  }

  protected async maybeStall() {
    const now = Date.now();
    let i, key, job;

    if (!this._connected) {
      if (now - this._start > this.connectTimeout) {
        await this.error(new TimeoutError('Timed out waiting for connection.'));
        await this.end();
        return;
      }
      return;
    }

    const keys = Object.keys(this._jobs);

    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      job = this._jobs[key];
      if (now - job.ts > (job.timeout ?? this.requestTimeout)) {
        delete this._jobs[key];
        job.reject(new TimeoutError('Job timed out.'));
      }
    }

    if (!this._challenge && now - this._lastActive > this._keepalive) {
      this._challenge = utils.nonce();
      this._lastActive = now;
      await this.sendPing(this._challenge);
      return;
    }

    if (now - this._lastActive > this._aliveTimeout) {
      await this.error('Connection is stalling (ping).');
      await this.end();
      return;
    }
  }

  protected async error(err: Error | string) {
    if (!(err instanceof Error)) {
      err = new Error(err);
    }

    await this.emit('error', err);
  }

  protected async handleMessage(packet: Packet) {
    switch (packet.type) {
      case Packet.types.SIGNAL:
        await this.handleSignal(packet.name, packet.payload);
        break;
      case Packet.types.CALL:
        await this.handleCall(packet.id, packet.name, packet.payload);
        break;
      case Packet.types.ACK:
        await this.handleAck(packet.id, packet.payload);
        break;
      case Packet.types.ERROR:
        await this.handleError(packet.id, packet.code, packet.msg, packet.payload);
        break;
      case Packet.types.PING:
        await this.handlePing(packet.payload);
        break;
      case Packet.types.PONG:
        await this.handlePong(packet.payload);
        break;
      default:
        throw new Error('Unknown packet.');
    }

    this._lastActive = getTime();
  }

  protected async handleSignal(event: string, data: Buffer) {
    await this.remoteEmittery.emit(event, this.deserialize(data));
  }

  protected async handleCall(id: number, name: string, data: Buffer) {
    if (!this.invoke) {
      throw new Error('"invoke" has not been set');
    }

    const parseParams = (raw: Buffer) => {
      try {
        return this.deserialize(raw);
      } catch (e) {
        throw new InvalidParamsError({message: e.message});
      }
    };

    try {
      await this.invoke(name, parseParams(data), async result => this.sendAck(id, await result));
    } catch (e) {
      await this.sendError(id, makeRemError(e));
    }
  }

  protected async handleAck(id: number, data: Buffer) {
    const job = this._jobs[id];
    if (!job) {
      // throw new Error('Job not found for ' + id + '.');
      await this.emit('nojob', {type: 'ack', id});
      return;
    }
    delete this._jobs[id];

    const value = this.deserialize(data);
    job.resolve(value);
  }

  protected async handleError(id: number, code: number, message: string, data?: Buffer) {
    const job = this._jobs[id];

    if (!job) {
      // throw new Error('Job not found for ' + id + '.');
      await this.emit('nojob', {type: 'error', id});
      return;
    }

    delete this._jobs[id];

    job.reject(new RemError({code, message, data: this.deserialize(data)}));
  }

  protected async handlePing(nonce: Buffer) {
    await this.sendPong(nonce);
  }

  protected async handlePong(nonce: Buffer) {
    if (!this._challenge || nonce.compare(this._challenge) !== 0) {
      await this.error('Remote node sent bad pong.');
      await this.end();
      return;
    }
    this._challenge = undefined;
  }

  protected async sendSignal(signal: string, data?: any) {
    await this.ready();
    const packet = new Packet();
    packet.type = Packet.types.SIGNAL;
    packet.name = signal;
    packet.payload = this.serialize(data);
    await this.send(packet);
  }

  protected async sendCall(id: number, event: string, data?: any) {
    await this.ready();
    const packet = new Packet();
    packet.type = Packet.types.CALL;
    packet.id = id;
    packet.name = event;
    packet.payload = this.serialize(data);
    await this.send(packet);
  }

  protected async sendAck(id: number, data: Buffer) {
    await this.ready();
    const packet = new Packet();
    packet.type = Packet.types.ACK;
    packet.id = id;
    packet.payload = this.serialize(data);
    await this.send(packet);
  }

  protected async sendError(id: number, err: RemError) {
    await this.ready();
    const packet = new Packet();
    packet.type = Packet.types.ERROR;
    packet.id = id;
    packet.msg = err.message;
    packet.code = err.code;
    packet.payload = this.serialize(err.data);
    await this.send(packet);
  }

  protected async sendPing(nonce: Buffer) {
    await this.ready();
    const packet = new Packet();
    packet.type = Packet.types.PING;
    packet.payload = nonce;
    await this.send(packet);
  }

  protected async sendPong(nonce: Buffer) {
    await this.ready();
    const packet = new Packet();
    packet.type = Packet.types.PONG;
    packet.payload = nonce;
    await this.send(packet);
  }
}
