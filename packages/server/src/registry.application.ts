import {RegistryMixin} from '@drpc/core';
import {Application} from './application';

export class ApplicationWithRegistry extends RegistryMixin(Application) {}
