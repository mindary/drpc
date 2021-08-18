import {PickProperties} from 'ts-essentials';
import {DatalessEventNames, Emittery, OmnipresentEventData, Options, UnsubscribeFn} from '@libit/emittery';

export type Emitter<EventData, AllEventData, DatalessEvents> = Omit<
  PickProperties<Emittery<EventData, AllEventData, DatalessEvents>, Function>,
  'emitSerial' | 'emit'
>;

export class RemoteEmitter<
  EventData = Record<string | symbol, any>, // When https://github.com/microsoft/TypeScript/issues/1863 ships, we can switch this to have an index signature including Symbols. If you want to use symbol keys right now, you need to pass an interface with those symbol keys explicitly listed.
  AllEventData = EventData & OmnipresentEventData,
  DatalessEvents = DatalessEventNames<EventData>,
> implements Emitter<EventData, AllEventData, DatalessEvents>
{
  public readonly emitter: Emittery<EventData, AllEventData, DatalessEvents>;

  constructor(options: Options<EventData> = {}) {
    this.emitter = new Emittery(options);
  }

  logIfDebugEnabled(type: string, eventName: any, eventData: any): void {
    return this.emitter.logIfDebugEnabled(type, eventName, eventData);
  }

  on<Name extends keyof AllEventData>(
    eventName: Name | Name[],
    listener: (eventData: AllEventData[Name]) => any,
  ): UnsubscribeFn {
    return this.emitter.on(eventName, listener);
  }

  off<Name extends keyof AllEventData>(
    eventName: Name[] | Name,
    listener: (eventData: AllEventData[Name]) => any,
  ): void {
    return this.emitter.off(eventName, listener);
  }

  once<Name extends keyof AllEventData>(eventNames: Name[] | Name): Promise<AllEventData[Name]> {
    return this.emitter.once(eventNames);
  }

  events<Name extends keyof EventData>(eventName: Name | Name[]): AsyncIterableIterator<EventData[Name]> {
    return this.emitter.events(eventName);
  }

  // emit<Name extends DatalessEvents>(eventName: Name): Promise<void>;
  // emit<Name extends keyof EventData>(eventName: Name, eventData: EventData[Name]): Promise<void>;
  // emit(eventName: any, eventData?: any): Promise<void> {
  //   return this.emitter.emit(eventName, eventData);
  // }

  onAny(listener: (eventName: keyof EventData, eventData?: EventData[keyof EventData]) => any): UnsubscribeFn {
    return this.emitter.onAny(listener);
  }

  anyEvent(): AsyncIterableIterator<[keyof EventData, EventData[keyof EventData]]> {
    return this.emitter.anyEvent();
  }

  offAny(listener: (eventName: keyof EventData, eventData: EventData[keyof EventData]) => any): void {
    return this.emitter.offAny(listener);
  }

  clearListeners<Name extends keyof EventData>(eventName?: Name | Name[]): void {
    return this.emitter.clearListeners(eventName);
  }

  listenerCount<Name extends keyof EventData>(eventName?: Name | Name[]): number {
    return this.emitter.listenerCount(eventName);
  }

  bindMethods(target: Record<string, unknown>, methodNames?: readonly string[]): void {
    return this.emitter.bindMethods(target, methodNames);
  }
}
