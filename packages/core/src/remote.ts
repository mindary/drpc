import {assert} from 'ts-essentials';
import {Options, UnsubscribeFn} from '@libit/emittery';
import {AckMessageType, ErrorMessageType, Packet, SignalMessageType} from '@drpc/packet';
import {Store} from './store';
import {Socket} from './sockets';
import {RemoteError} from './errors';
import {RemoteEmitter} from './remote-emitter';
import {RemoteMethods, RemoteService, ServiceDefinition, ServiceMethods} from './remote-service';
import {OnOutgoing} from './types';
import {Request} from './request';

export interface RemoteEvents {
  noreq: {type: 'ack' | 'error'; id: number};
  disconnect: undefined;

  [p: string]: any;
}

export interface RemoteOptions extends Options<any> {
  onoutgoing?: OnOutgoing;
}

export class Remote<SOCKET extends Socket = any> extends RemoteEmitter<RemoteEvents> {
  public onoutgoing: OnOutgoing;

  protected store: Store = new Store();
  protected unsubs: UnsubscribeFn[] = [];

  constructor(public socket: SOCKET, options: RemoteOptions = {}) {
    super(options);
    this.onoutgoing = options?.onoutgoing ?? ((request, next) => next());
    this.bind();
  }

  get address() {
    return this.socket.address;
  }

  get lastActive(): number {
    return this.socket.lastActive;
  }

  get state() {
    return this.socket.state;
  }

  get isOpen() {
    return this.socket.isOpen();
  }

  get isConnected() {
    return this.socket.isConnected();
  }

  dispose() {
    this.unbind();
  }

  ready() {
    return this.socket.ready();
  }

  service<T extends ServiceMethods>(definition: ServiceDefinition<T>, timeout?: number): RemoteMethods<T> {
    return RemoteService.build(this, definition, timeout);
  }

  /**
   * Call remote method
   *
   * @param method
   * @param args
   * @param timeout
   */
  async call(method: string, args?: any, timeout?: number) {
    assert(typeof method === 'string', 'Event must be a string.');
    await this.assertOrWaitConnected();
    const r = this.store.acquire(timeout ?? this.socket.requestTimeout);
    const request = new Request(this.socket, 'call', {
      // metadata: this.socket.metadata,
      message: {id: r.id, name: method, payload: args},
    });

    return this.onoutgoing(request, async () => {
      await this.socket.send(
        'call',
        {
          id: r.id,
          name: request.message.name,
          payload: request.message.payload,
        },
        request.metadata,
      );
      return r.promise;
    });
  }

  /**
   * Emit remote event
   *
   * @param event
   * @param data
   */
  async signal(event: string, data?: any) {
    assert(typeof event === 'string', 'Event must be a string.');
    const request = new Request<'signal'>(this.socket, 'signal', {
      message: {name: event, payload: data},
    });

    await this.assertOrWaitConnected();
    await this.onoutgoing(request, async () => {
      await this.socket.send(
        'signal',
        {name: request.message.name, payload: request.message.payload},
        request.metadata,
      );
    });
  }

  async emit(message: SignalMessageType) {
    const {name, payload} = message;
    await this.emitter.emit(name, payload);
  }

  protected bind() {
    if (!this.unsubs.length) {
      this.unsubs.push(
        this.socket.on('close', async () => {
          await this.emitter.emit('disconnect');
          this.dispose();
        }),
        this.socket.on('tick', () => this.store.check()),
        this.socket.on('response', packet => this.handleReply(packet)),
      );
    }
  }

  protected unbind() {
    while (this.unsubs.length) {
      this.unsubs.shift()?.();
    }
  }

  protected async handleReply(packet: Packet) {
    switch (packet.type) {
      case 'ack':
        await this.handleAck((packet as Packet<'ack'>).message);
        break;
      case 'error':
        await this.handleError((packet as Packet<'error'>).message);
        break;
    }
  }

  protected async handleAck(message: AckMessageType) {
    const {id, payload} = message;

    if (!this.store.has(id)) {
      await this.signal('noreq', {type: 'ack', id});
      return;
    }

    this.store.resolve(id, payload);
  }

  protected async handleError(message: ErrorMessageType) {
    const {id, code, message: msg} = message;

    if (!this.store.has(id)) {
      await this.signal('noreq', {type: 'error', id});
      return;
    }

    this.store.reject(id, new RemoteError(code, msg));
  }

  protected async assertOrWaitConnected() {
    if (!this.socket.isConnected()) {
      if (this.socket.isOpen()) {
        await this.socket.once('connected');
      } else {
        throw new Error('connection is not active');
      }
    }
  }
}
