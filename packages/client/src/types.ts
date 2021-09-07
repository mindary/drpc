import {ClientRequestArgs} from 'http';
import {KeyObject} from 'tls';
import {GenericInterceptor} from '@libit/interceptor';
import {
  Carrier,
  ClientSocket,
  ClientSocketOptions,
  Request,
  RequestPacketType,
  Transport,
  TransportOptions,
} from '@drpc/core';
import {Client} from './client';

export type ClientRequest = Request<RequestPacketType, ClientSocket>;

export type ClientIncomingHandler = GenericInterceptor<Carrier<RequestPacketType>>;
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
   * 1000 milliseconds, interval between two reconnections
   */
  reconnectPeriod?: number;
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
  metadata?: Record<string, any>;
}

export type WrappedConnect = (client: Client) => Transport;

export interface ClientChannel {
  connect(client: Client, opts: ClientOptions): Transport;
}
