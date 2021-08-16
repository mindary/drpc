import {Signer} from '@libit/josa';
import {Application, ApplicationOptions} from '@remly/server';
import {josa} from './josa';

export class ECDSAApplication extends Application {
  signer: Signer;

  constructor(options?: ApplicationOptions) {
    super(options);
    this.signer = new Signer();

    this.addConnectInterceptor(josa({serializer: this.serializer, signer: this.signer}));
  }
}
