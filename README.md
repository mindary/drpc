# remly

A binary-only RPC protocol for multiple transports such as WebSocket, WebWorker, HTTP, BLE and so on.

## Why?

Most websocket-based protocols use JSON. JSON is big and slow. In many cases when needing to send binary data over a
conventional websocket protocol, the programmer is forced to use hex strings inside the JSON serialization. This is
inefficient.

Furthermore, most event-based abstractions on top of websockets introduce an enormous amount of bloat due to the
inclusion of fallback transports (xhr, long-polling, etc) as well as even higher level abstractions (channels).

Remly works only with binary data and gives you a simple event based interface without anything else. No channels, no
fallback, no complicated handshakes or feature testing over HTTP.

## Specification

See `spec.md`.

## Licence

* Copyright (c) 2020, Yuan Tao (MIT License). 
* Copyright (c) 2017, Christopher Jeffrey (MIT License).
