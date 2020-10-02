import {Socket} from 'net';
import {StreamTransport, TransportContext} from '../..';

export class TcpTransport extends StreamTransport {
  constructor(public conn: Socket) {
    super();

    const c = <any>conn;
    c.__rpc = c.__rpc || {conn};

    conn.on('data', data => {
      this.read(data, c.__rpc);
    });

    conn.on('end', () => {
      this.emit('end');
    });
  }

  write(data: Buffer, context: TransportContext) {
    this.conn.write(data);
  }

  async close() {
    this.conn.end();
  }
}
