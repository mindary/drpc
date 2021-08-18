import {Socket} from '../sockets';
import {Request} from './request';

export class OutgoingRequest<SOCKET extends Socket = any> extends Request<SOCKET> {
  end(payload: any): Promise<any> {
    throw new Error('Unsupported');
  }

  error(err: any): Promise<any> {
    throw new Error('Unsupported');
  }
}
