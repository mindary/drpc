import {ClientSocket, RegistryMixin, RemoveServiceMixin} from '@remly/core';

export class Client extends RegistryMixin(RemoveServiceMixin(ClientSocket)) {}
