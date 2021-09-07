import {Transport, ValueOrPromise} from '@remly/core';
import {listenPort, MessagePort} from './port';

export class PortTransport extends Transport {
  protected unbind: () => void;

  constructor(public port: MessagePort) {
    super();
    this.bind();
    this.open();
  }

  protected bind() {
    this.unbind = listenPort(this.port, {
      onmessage: (message: any) => this.onData(message),
      onmessageerror: (error: any) => this.onError(error),
      onerror: (error: any) => this.onError(error),
      onclose: () => this.doClose('worker lost'),
    });
  }

  protected doSend(data: Buffer): ValueOrPromise<any> {
    return this.port.postMessage(data);
  }

  protected async doClose(reason?: string | Error) {
    this.unbind();
    await super.doClose(reason);
    this.port.close();
  }
}
