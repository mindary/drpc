import {assert} from 'ts-essentials';
import {Buffer} from 'buffer';
import {Emittery} from '@libit/emittery';
import {Exception} from '@libit/error/exception';

export interface AliveEvents {
  error: Error;
  expired: Buffer;
}

export type ChallengeGenerator = () => Buffer;

export class ChallengeNotMatchError extends Exception {
  constructor() {
    super('challenge not match');
  }
}

export class AliveTimeoutError extends Exception {
  constructor() {
    super('alive is timeout');
  }
}

export class Alive extends Emittery<AliveEvents> {
  protected _lastActive: number;
  protected _challenge: any;
  protected generateChallenge?: ChallengeGenerator;

  constructor(keepalive: number, generateChallenge?: ChallengeGenerator | boolean) {
    super();
    this.keepalive = keepalive;
    if (generateChallenge !== false) {
      this.generateChallenge = typeof generateChallenge === 'function' ? generateChallenge : nonce;
    }
    this.touch();
  }

  protected _timeout: number;

  get timeout() {
    return this._timeout;
  }

  set timeout(timeout: number) {
    if (timeout > this._keepalive) {
      this._timeout = timeout;
    }
  }

  protected _keepalive: number;

  get keepalive() {
    return this._keepalive;
  }

  set keepalive(keepalive: number) {
    assert(keepalive >= 0, '"keepalive" must be more than 0');
    this._keepalive = keepalive;
    this._timeout = keepalive * 1.5;
  }

  get lastActive(): number {
    return this._lastActive;
  }

  touch() {
    this._lastActive = Date.now();
  }

  async update(challenge: any) {
    if (!this._challenge || !isSame(this._challenge, challenge)) {
      return this.emit('error', new ChallengeNotMatchError());
    }
    if (challenge) {
      this._challenge = undefined;
    }
    this.touch();
  }

  async tick(now?: number) {
    now = now ?? Date.now();

    if (!this._challenge && now - this._lastActive > this._keepalive) {
      this._lastActive = now;
      if (this.generateChallenge) {
        this._challenge = this.generateChallenge();
      }
      await this.emit('expired', this._challenge);
    }

    if (now - this._lastActive > this._timeout) {
      await this.emit('error', new AliveTimeoutError());
    }
  }
}

function isSame(a: any, b: any): boolean {
  if (Buffer.isBuffer(a) && Buffer.isBuffer(b)) {
    return a.compare(b) === 0;
  }
  return a === b;
}

function nonce() {
  const n = Buffer.alloc(8);
  const a = (Math.random() * 0x100000000) >>> 0;
  const b = (Math.random() * 0x100000000) >>> 0;

  n.writeUInt32LE(a, 0);
  n.writeUInt32LE(b, 4);

  return n;
}
