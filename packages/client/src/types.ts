import {ClientRequestArgs} from 'http';
import {KeyObject} from 'tls';
import {GenericInterceptor} from '@libit/interceptor';
import {
  ActionPacketType,
  Carrier,
  ClientSocket,
  ClientSocketOptions,
  Request,
  Transport,
  TransportOptions,
} from '@drpc/core';
import {Client} from './client';
import * as Buffer from 'buffer';

export type ClientCarrier = Carrier<ActionPacketType, ClientSocket>;
export type ClientRequest = Request<ActionPacketType, ClientSocket>;

export type ClientIncomingHandler = GenericInterceptor<ClientCarrier>;
export type ClientOutgoingHandler = GenericInterceptor<ClientRequest>;

export type ProtocolType = 'ws' | 'wss' | 'tcp' | 'tls' | 'ssl';

export interface SecureClientOptions {
  /**
   * optional private keys in PEM format
   */
  key?: string | Buffer | Array<Buffer | KeyObject> | undefined;
  /**
   * optional cert chains in PEM format
   */
  cert?: string | string[] | Buffer | Buffer[];
  /**
   * Optionally override the trusted CA certificates in PEM format
   */
  ca?: string | string[] | Buffer | Buffer[];
  rejectUnauthorized?: boolean;
}

export interface ClientOptions
  extends Partial<Omit<ClientSocketOptions, 'metadata'>>,
    SecureClientOptions,
    TransportOptions {
  port?: number; // port is made into a number subsequently
  host?: string; // host does NOT include port
  hostname?: string;
  path?: string;
  protocol?: ProtocolType;

  channel?: string | ClientChannel;

  wsOptions?: ClientOptions | ClientRequestArgs;
  /**
   *  10 seconds, set to 0 to disable
   */
  keepalive?: number;
  /**
   * 'mqttjs_' + Math.random().toString(16).substr(2, 8)
   */
  clientId?: string;
  /**
   * 'MQTT'
   */
  protocolId?: string;
  /**
   * 4
   */
  protocolVersion?: number;

  /**
   * Should we allow reconnections?
   * @default true
   */
  reconnection?: boolean;

  /**
   * How many reconnection attempts should we try?
   * @default Infinity
   */
  reconnectionAttempts?: number;

  /**
   * The time delay in milliseconds between reconnection attempts
   * @default 1000
   */
  reconnectionDelay?: number;

  /**
   * The max time delay in milliseconds between reconnection attempts
   * @default 5000
   */
  reconnectionDelayMax?: number;

  /**
   * Used in the exponential backoff jitter when reconnecting
   * @default 0.5
   */
  randomizationFactor?: number;

  /**
   * 30 * 1000 milliseconds, time to wait before a CONNACK is received
   */
  connectTimeout?: number;
  /**
   * the auth option: [username]:[password]
   */
  auth?: string;
  /**
   * the username required by your broker, if any
   */
  username?: string;
  /**
   * the password required by your broker, if any
   */
  password?: string;

  reschedulePings?: boolean;
  servers?: Array<{
    host: string;
    port: number;
    protocol?: ProtocolType;
  }>;
  transformWsUrl?: (url: string, options: ClientOptions, client: Client) => string;
  metadata?: {
    authmethod?: string;
    authdata?: Buffer;
  } & Record<string, Buffer | string>;
}

export type WrappedConnect = (client: Client) => Transport;

export interface ClientChannel {
  connect(client: Client, opts: ClientOptions): Transport;
}
