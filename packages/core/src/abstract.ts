import {assert} from 'ts-essentials';
import Emittery from 'emittery';
import shortid from 'shortid';
import {Defer} from '@tib/defer';
import {getTime} from '@remly/schedule';
import {JsonSerializer, Raw, Serializer} from '@remly/serializer';
import {SignalName} from './types';
import {Packet} from './packet';
import * as utils from './utils';
import {rawLength, readBinary, syncl} from './utils';
import {InvalidParamsError, makeRemError, RemError, TimeoutError, UnknownError} from './error';
import {DefaultParser, Parser} from './parsers';
import {DefaultRegistry, Registry} from './registry';

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

export interface ConnectionDataEvents {
  error: Error;
  /**
   * Triggered when a response is received and the corresponding job has timed out or expired.
   */
  nojob: NoJob;
}

export type ConnectionEmptyEvents = 'open' | 'close';

export interface ConnectionOptions {
  id?: string;

  registry?: Registry;
  parser?: Parser;
  serializer?: Serializer;

  interval?: number;
  keepalive?: number;
  requestTimeout?: number;
  pingTimeout?: number;
  connectTimeout?: number;
}

const DEFAULT_KEEPALIVE = 30 * 1000;
const DEFAULT_STALL_INTERVAL = 5 * 1000;
const DEFAULT_REQUEST_TIMEOUT = 10 * 1000;
const DEFAULT_CONNECT_TIMEOUT = 10 * 1000;

/**
 * Connection
 * @constructor
 * @ignore
 */
export abstract class AbstractConnection<
  DataEvents extends ConnectionDataEvents = ConnectionDataEvents,
  EmptyEvents extends SignalName = ConnectionEmptyEvents
> extends Emittery.Typed<DataEvents & ConnectionDataEvents, EmptyEvents | ConnectionEmptyEvents> {
  protected _id: string;

  protected _ready: Defer<void>;

  protected _timer?: any;
  protected _challenge?: Buffer;
  protected _lastActive = 0;

  protected _jobs: Record<string, Job>;
  protected _ee: Emittery;
  protected _start: number;
  protected _sequence: number;
  protected _connected: boolean;
  protected _ended: boolean;
  protected _ending: boolean;

  protected _keepalive: number;
  protected _aliveTimeout: number;

  protected _registry?: Registry;

  public readonly parser: Parser;
  public readonly serializer: Serializer;

  public readonly interval: number;
  public readonly requestTimeout: number;
  public readonly connectTimeout: number;

  protected abstract bind(): void;

  protected abstract async close(): Promise<void>;

  protected abstract async send(packet: Packet): Promise<void>;

  get id() {
    return this._id;
  }

  get keepalive() {
    return this._keepalive;
  }

  get connected() {
    return this._connected;
  }

  get ended() {
    return this._ended;
  }

  get registry() {
    if (!this._registry) {
      this._registry = new DefaultRegistry();
    }
    return this._registry;
  }

  protected constructor(options?: ConnectionOptions) {
    super();
    this._id = options?.id ?? 'remly_' + shortid();
    this._registry = options?.registry;

    this.parser = options?.parser ?? new DefaultParser();
    this.serializer = options?.serializer ?? new JsonSerializer();

    this.interval = options?.interval ?? DEFAULT_STALL_INTERVAL;
    this.requestTimeout = options?.requestTimeout ?? DEFAULT_REQUEST_TIMEOUT;
    this.connectTimeout = options?.connectTimeout ?? DEFAULT_CONNECT_TIMEOUT;

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

  setKeepAlive(keepalive: number) {
    if (keepalive < this.interval) {
      keepalive = this.interval;
    }
    this._keepalive = keepalive;
    this._aliveTimeout = keepalive * 1.5;
  }

  protected reset() {
    this._jobs = {};
    this._ee = new Emittery();
    this._start = 0;
    this._sequence = 0;
    this._connected = false;
    this._ended = false;
    this._ready = new Defer<void>();
  }

  protected init() {
    debug(this.id, 'init');
    assert(this.parser, '`parser` is required, but not provide');
    this._start = Date.now();

    this.bind();
    this.parser.on(
      'error',
      syncl(async (err: any) => {
        this.error(err);
        await this.end();
      }, this),
    );

    this.parser.on(
      'message',
      syncl<Packet>(async packet => {
        try {
          await this.handleMessage(packet);
        } catch (e) {
          try {
            await this.sendError(packet.id, new UnknownError());
          } catch (_) {
            //
          }
          this.error(e);
          await this.end();
        }
      }, this),
    );

    this.startStall();
  }

  async ready(): Promise<void> {
    if (this._ending) {
      throw new Error('connection is ending');
    }

    if (this._ended) {
      throw new Error('connection already ended');
    }

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    if (!this._ready) {
      this._ready = new Defer<void>();
    }
    return this._ready;
  }

  async feed(data: any) {
    return this.parser.feed(await readBinary(data));
  }

  protected doConnected() {
    debug(this.id, 'doConnected');
    this._connected = true;
    this._ready.resolve();

    this.onConnected();
    // eslint-disable-next-line no-void
    void this.emit('open');
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
    this._timer = setInterval(
      syncl(() => this.maybeStall(), this),
      this.interval,
    );
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
        this.error(new TimeoutError('Timed out waiting for connection.'));
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
      this.error('Connection is stalling (ping).');
      await this.end();
      return;
    }
  }

  protected error(err: Error | string) {
    if (!(err instanceof Error)) {
      err = new Error(err);
    }

    // eslint-disable-next-line no-void
    void this.emit('error', err);
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

  protected async handleMessage(packet: Packet) {
    let result;

    switch (packet.type) {
      case Packet.types.SIGNAL:
        await this.handleEvent(packet.name, packet.payload);
        break;
      case Packet.types.CALL:
        result = await this.handleCall(packet.id, packet.name, packet.payload);
        break;
      case Packet.types.ACK:
        this.handleAck(packet.id, packet.payload);
        break;
      case Packet.types.ERROR:
        this.handleError(packet.id, packet.code, packet.msg, packet.payload);
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

    return result;
  }

  protected async handleEvent(event: string, data: Buffer) {
    await this._ee.emit(event, this.deserialize(data));
  }

  protected async handleCall(id: number, name: string, data: Buffer) {
    const parseParams = (raw: Buffer) => {
      try {
        return this.deserialize(raw);
      } catch (e) {
        throw new InvalidParamsError({message: e.message});
      }
    };

    try {
      const params = parseParams(data);
      const result = await this.registry.invoke(name, params);
      await this.sendAck(id, result);
    } catch (e) {
      await this.sendError(id, makeRemError(e));
    }
  }

  protected handleAck(id: number, data: Buffer) {
    const job = this._jobs[id];
    if (!job) {
      // throw new Error('Job not found for ' + id + '.');
      // eslint-disable-next-line no-void
      void this.emit('nojob', {type: 'ack', id});
      return;
    }
    delete this._jobs[id];

    const value = this.deserialize(data);
    job.resolve(value);
  }

  protected handleError(id: number, code: number, message: string, data?: Buffer) {
    const job = this._jobs[id];

    if (!job) {
      // throw new Error('Job not found for ' + id + '.');
      // eslint-disable-next-line no-void
      void this.emit('nojob', {type: 'error', id});
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
      this.error('Remote node sent bad pong.');
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
