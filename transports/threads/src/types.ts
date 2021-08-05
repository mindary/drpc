export type ErrorHandler = (error: any) => any;

export interface WorkerListeners {
  onmessage?: (message: any) => void;
  onmessageerror?: ErrorHandler;
  onerror?: ErrorHandler;
  onexit?: (exitCode: number) => void;
}
