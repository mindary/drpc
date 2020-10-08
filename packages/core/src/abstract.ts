import {assert} from 'ts-essentials';
import Emittery from 'emittery';
import shortid from 'shortid';
import {getTime} from '@remly/schedule';
import {JsonSerializer, Raw, Serializer} from '@remly/serializer';
import {EventName} from './types';
import {Packet} from './packet';
import * as utils from './utils';
import {rawLength, syncl} from './utils';
import {InvalidParamsError, makeRemError, RemError, TimeoutError, UnknownError} from './error';
import {Parser} from './parser';
import {DefaultParser} from './parser.default';
import {Registry} from './registry';

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

export type ConnectionEmptyEvents = 'connect' | 'close';

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
  EmptyEvents extends EventName = ConnectionEmptyEvents
> extends Emittery.Typed<DataEvents & ConnectionDataEvents, EmptyEvents | ConnectionEmptyEvents> {
  protected _id: string;

  protected _timer?: any;
  protected _challenge?: Buffer;
  protected _lastActive = 0;

  protected _jobs: Record<string, Job>;
  protected _ee: Emittery;
  protected _start: number;
  protected _sequence: number;
  protected _connected: boolean;
  protected _ended: boolean;

  protected _keepalive: number;
  protected _aliveTimeout: number;

  protected _registry?: Registry;

  public readonly parser: Parser;
  public readonly serializer: Serializer;

  public readonly interval: number;
  public readonly requestTimeout: number;
  public readonly connectTimeout: number;

  protected abstract bind(): void;

  protected abstract close(): void;

  protected abstract send(packet: Packet): void;

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
      this._registry = new Registry();
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
  }

  protected init() {
    assert(this.parser, '`parser` is required, but not provide');
    this._start = Date.now();

    this.bind();
    this.parser.on('error', err => {
      this.error(err);
      this.end();
    });

    this.parser.on(
      'message',
      syncl<Packet>(async packet => {
        try {
          await this.handleMessage(packet);
        } catch (e) {
          try {
            this.sendError(packet.id, new UnknownError());
          } catch (_) {
            //
          }
          this.error(e);
          this.end();
        }
      }, this),
    );

    this.startStall();
  }

  feed(data: Buffer) {
    return this.parser.feed(data);
  }

  protected doConnected() {
    this._connected = true;
    this.onConnected();
    // eslint-disable-next-line no-void
    void this.emit('connect');
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
    assert(this._timer == null);
    this._timer = setInterval(() => this.maybeStall(), this.interval);
  }

  protected stopStall() {
    assert(this._timer != null);
    clearInterval(this._timer);
    this._timer = undefined;
  }

  protected maybeStall() {
    const now = Date.now();
    let i, key, job;

    if (!this._connected) {
      if (now - this._start > this.connectTimeout) {
        this.error(new TimeoutError('Timed out waiting for connection.'));
        this.end();
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
      this.sendPing(this._challenge);
      return;
    }

    if (now - this._lastActive > this._aliveTimeout) {
      this.error('Connection is stalling (ping).');
      this.end();
      return;
    }
  }

  protected error(err: Error | string) {
    if (!(err instanceof Error)) err = new Error(err);

    // eslint-disable-next-line no-void
    void this.emit('error', err);
  }

  end() {
    debug('end');
    const jobs = this._jobs;
    const keys = Object.keys(jobs);

    if (this._ended) return;

    this.close();
    this.stopStall();

    this._connected = false;
    this._challenge = undefined;
    this._ended = true;

    this._jobs = {};

    for (const key of keys) {
      jobs[key].reject(new Error('Connection was destroyed.'));
    }

    // eslint-disable-next-line no-void
    void this.emit('close');
  }

  protected async handleMessage(packet: Packet) {
    let result;

    switch (packet.type) {
      case Packet.types.EVENT:
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
        this.handlePing(packet.payload);
        break;
      case Packet.types.PONG:
        this.handlePong(packet.payload);
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
      this.sendAck(id, result);
    } catch (e) {
      this.sendError(id, makeRemError(e));
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

  protected handlePing(nonce: Buffer) {
    this.sendPong(nonce);
  }

  protected handlePong(nonce: Buffer) {
    if (!this._challenge || nonce.compare(this._challenge) !== 0) {
      this.error('Remote node sent bad pong.');
      this.end();
      return;
    }
    this._challenge = undefined;
  }

  protected sendEvent(event: string, data?: any) {
    const packet = new Packet();
    packet.type = Packet.types.EVENT;
    packet.name = event;
    packet.payload = this.serialize(data);
    this.send(packet);
  }

  protected sendCall(id: number, event: string, data?: any) {
    const packet = new Packet();
    packet.type = Packet.types.CALL;
    packet.id = id;
    packet.name = event;
    packet.payload = this.serialize(data);
    this.send(packet);
  }

  protected sendAck(id: number, data: Buffer) {
    const packet = new Packet();
    packet.type = Packet.types.ACK;
    packet.id = id;
    packet.payload = this.serialize(data);
    this.send(packet);
  }

  protected sendError(id: number, err: RemError) {
    const packet = new Packet();
    packet.type = Packet.types.ERROR;
    packet.id = id;
    packet.msg = err.message;
    packet.code = err.code;
    packet.payload = this.serialize(err.data);
    this.send(packet);
  }

  protected sendPing(nonce: Buffer) {
    const packet = new Packet();
    packet.type = Packet.types.PING;
    packet.payload = nonce;
    this.send(packet);
  }

  protected sendPong(nonce: Buffer) {
    const packet = new Packet();
    packet.type = Packet.types.PONG;
    packet.payload = nonce;
    this.send(packet);
  }
}
