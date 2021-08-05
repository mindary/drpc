export type ErrorHandler = (error: any) => any;

export interface PortListeners {
  onmessage?: (message: any) => void;
  onmessageerror?: ErrorHandler;
  onerror?: ErrorHandler;
  onclose?: () => any;
}
