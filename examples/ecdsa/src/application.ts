import {Application, ApplicationOptions} from "@drpc/server";
import {Signer} from "@libit/josa";

export class EcdsaApplication extends Application {
  signer: Signer;

  constructor(options?: ApplicationOptions) {
    super(options);
    this.signer = new Signer();
    this.onconnect = carrier => {
    }
  }
}
