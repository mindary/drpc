import debugFactory from 'debug';
import {Server, ServerClass} from '@remly/server';
import {assert} from 'ts-essentials';
import {resolveServerChannel} from './resolver';
import {ChainedError} from '@libit/error/chained';

const debug = debugFactory('remly:channel:factory');

export interface ServerChannelSettings {
  debug?: boolean;
  name?: string;
  channel?: string | ServerClass;

  [p: string]: any;
}

/**
 * Create the server channel. The following styles are supported:
 *
 * ```js
 * createServerChannel('myServerChannel', {channel: 'tcp'}); // channel.name -> 'myServerChannel'
 * createServerChannel('myServerChannel', {name: 'myServerChannel', channel: 'tcp'}); // channel.name -> 'myServerChannel'
 * createServerChannel('myServerChannel', {name: 'anotherDataSource', channel: 'tcp'}); // channel.name -> 'myServerChannel' and a warning will be issued
 * createServerChannel({name: 'myServerChannel', channel: 'tcp'}); // channel.name -> 'myServerChannel'
 * createServerChannel({channel: 'tcp'}); // channel.name -> 'tcp'
 * ```
 *
 * @param {String} name The name of the channel. If not set, use `settings.name`
 * @param {Object} settings The settings
 */

export function createServerChannel<T extends Server = Server>(
  name?: string | ServerClass,
  settings?: ServerChannelSettings,
): T;
export function createServerChannel<T extends Server = Server>(settings: ServerChannelSettings): T;
export function createServerChannel<T extends Server = Server>(
  nameOrSettings?: string | ServerClass | ServerChannelSettings,
  settings?: ServerChannelSettings,
) {
  let name: string | undefined;
  let channel: string | ServerClass | undefined;
  let ServerChannel: ServerClass | undefined;

  if (nameOrSettings) {
    if (typeof nameOrSettings === 'object') {
      settings = nameOrSettings;
      name = undefined;
    } else if (typeof nameOrSettings === 'function') {
      channel = nameOrSettings;
      name = undefined;
    } else {
      name = nameOrSettings;
    }
  } else {
    assert(settings, 'settings is required if name is empty');
  }

  if (typeof name !== 'string') {
    name = undefined;
  }

  if (typeof settings === 'object') {
    if (settings.channel) {
      // Use `channel`
      channel = settings.channel;
    }
  }

  settings = settings || {};
  if (settings.debug) {
    debug('Settings: %j', settings);
  }

  if (
    typeof settings === 'object' &&
    typeof settings.name === 'string' &&
    typeof name === 'string' &&
    name !== settings.name
  ) {
    // createServerChannel('myChannel', {channel: 'anotherChannel'});
    // channel -> 'myChannel' and a warning will be issued
    console.warn(
      'A server channel is created with type %s, which is different from the type in settings (%s). ' +
        'Please adjust your configuration to ensure these names match.',
      name,
      settings.name,
    );
  }

  name = name ?? settings.name;

  let channelName;
  if (typeof channel === 'string') {
    channelName = channel;
    channel = undefined;
  } else {
    channelName = name;
    ServerChannel = channel;
  }

  name = name ?? channelName;

  if (!channel && channelName) {
    // The channel has not been resolved
    const result = resolveServerChannel(channelName);
    ServerChannel = result.channel;
    if (!ServerChannel) {
      console.error(result.error);
      throw new Error(result.error!);
    }
  }

  assert(ServerChannel, `Can not resolve server channel "${channelName}"`);

  try {
    return new ServerChannel({...settings, name});
  } catch (err) {
    throw new ChainedError('Cannot create server channel ' + JSON.stringify(channelName) + ': ' + err.message, err);
  }
}
