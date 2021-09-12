import {RegistryMixin} from '@drpc/registry';
import {Application} from '@drpc/server';

export class ApplicationWithRegistry extends RegistryMixin(Application) {}
