import {MemoryTransport} from './memory.transport';
import {createResponse, Request, ServerSocket} from '@drpc/core';

export function makeCallRequest(id: number, method: string, params?: any) {
  const t = new MemoryTransport();
  const socket = new ServerSocket(t);
  const request = new Request(socket, 'call', {
    message: {
      id,
      name: method,
      payload: params,
    },
  });
  const response = createResponse('call', socket, id);
  request.response = response;
  response.request = request;
  return request;
}
