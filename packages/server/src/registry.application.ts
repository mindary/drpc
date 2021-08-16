import {RegistryMixin} from '@remly/core';
import {Application} from './application';

export class ApplicationWithRegistry extends RegistryMixin(Application) {}
