/* eslint-disable @typescript-eslint/no-misused-promises */
import net from 'net';
import tls from 'tls';
import pick from 'tily/object/pick';
import {NetAddress, Transport, TransportOptions} from '@drpc/core';

export class TCPTransport extends Transport {
  protected unbind: () => void;

  constructor(public readonly socket: net.Socket | tls.TLSSocket, options?: TransportOptions) {
    super(options);
    this.bind();
    if (socket.readable && socket.writable) {
      // readyState is 'open'
      this.open();
    }
  }

  get address(): NetAddress {
    return pick(
      ['localAddress', 'localPort', 'remoteAddress', 'remotePort', 'remoteFamily'],
      (this.socket ?? {}) as NetAddress,
    );
  }

  protected bind() {
    const onopen = () => this.open();
    const ondata = (data: any) => this.onData(data);
    const onerror = (error: Error) => this.onError(error);
    const onclose = () => this.doClose('connection lost');

    this.socket.on(isSecure(this.socket) ? 'secureConnect' : 'connect', onopen);
    this.socket.on('data', ondata);
    this.socket.on('error', onerror);
    this.socket.on('close', onclose);

    this.unbind = () => {
      this.socket.off(isSecure(this.socket) ? 'secureConnect' : 'connect', onopen);
      this.socket.off('data', ondata);
      this.socket.off('error', onerror);
      this.socket.off('close', onclose);
    };
  }

  protected doSend(data: Buffer) {
    return this.socket.write(data);
  }

  protected async doClose(reason?: string | Error) {
    this.unbind();
    await super.doClose(reason);
    this.socket.destroy();
  }
}

function isSocket(x: any): x is net.Socket {
  return x && (x instanceof net.Socket || (typeof x.write === 'function' && typeof x.destroy === 'function'));
}

function isSecure(x: any): x is tls.TLSSocket {
  return typeof x?.getCertificate === 'function';
}

export function tcp(handle: (transport: Transport) => any, options?: TransportOptions) {
  return (socket: net.Socket | tls.TLSSocket) => handle(new TCPTransport(socket, options));
}

export function accept(socket: any, options?: TransportOptions) {
  if (isSocket(socket)) {
    return new TCPTransport(socket, options);
  }
}
