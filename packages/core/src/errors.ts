export class TimeoutError extends Error {
  readonly code: 'TIME_OUT';
  constructor(public message: any) {
    super(message);
  }
}

// export class InvalidMessageError extends Error {
//   readonly code: 'INVALID_MESSAGE';
//   constructor(public message: any) {
//     super(message);
//   }
// }
