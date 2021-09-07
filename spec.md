# DRPC Specification

The DRPC protocol is a _efficient_ RPC protocol designed to be used over some form of bidirectional communication (e.g.
tcp sockets or web sockets).

## Message Serialization

### Message Types

```c
enum {
  open: 10,
  connect: 11,
  connect_error: 12,
  signal: 20,
  call: 30,
  ack: 31,
  error: 32,
  ping: 40,
  pong: 41,
};
```

Communication is split into 9 different messages:

- OPEN (10)
- CONNECT (11)
- CONNECT_ERROR (12)
- SIGNAL (20)
- CALL (30)
- ACK (31)
- ERROR (32)
- PING (40)
- PONG (41)

Each message is serialized with a header, body, and payload. Note that all integers are to be serialized as
little-endian.

### Message Header

Serialization:

```c
typedef struct {
  uint8_t type;
  uint32_t size;
  uint32_t checksum;
} packet_header_t;
```

Every DRPC message consists of a 9 byte header which includes the message type, the body size (not including the 9 byte
header itself), as well as a 32 bit crc.

There is no DRPC handshake, as the client and server both know to wait for a 9 byte header. If the message `type` is
undefined, the client SHOULD treat the remote node as misbehaving and disconnect.

If the message payload itself does not match the message header size. The client SHOULD disconnect from the remote node.

If the message size exceeds 10,000,000 bytes, the client SHOULD treat the remote node as misbehaving and disconnect.

### Message Payloads

Payload size is implied by the body size sent in the header.

## Messages

### `OPEN(10)` packet

```c
typedef struct {
  packet_header_t header;
  uint8_t sid_str_size;
  char sid[sid_str_size];
  uint32_t keepalive;
  uint64_t challenge;
} open_packet_t;
```

The `OPEN` message is sent from server to client to notify that client should begin handshake.

### `COONECT(11)` packet

```c
typedef struct {
  packet_header_t header;
  char* payload;
} connect_packet_t;
```

The `CONNECT` message has two stages.

1. First is sent from client after client received `OPEN` message from server to request to connect with authentication
   information payload.
2. Second is sent from server after server received first `CONNECT` message from client to response handshake
   information if successful.

### `CONNECT_ERROR(12)` packet

```c
typedef struct {
  packet_header_t header;
  uint8_t code;
  uint16_t msg_size;
  char msg[msg_size];
} connect_error_packet_t;
```

The `CONNECT_ERROR` message is for both side to notify any error throws in connection relative.

### `SIGNAL(20)` packet

```c
typedef struct {
  packet_header_t header;
  uint8_t signal_str_size;
  char signal[signal_str_size];
  char *payload;
} signal_packet_t;
```

The SIGNAL message is sent to a remote node without any expectation of a response. Signal names are serialized as
strings within the message itself, prefixed by a 1 byte size. If an unknown signal is received, the client SHOULD ignore
the message without disconnecting.

### `CALL(30)` packet

```c
typedef struct {
  packet_header_t header;
  uint8_t method_str_size;
  char method[method_str_size];
  uint32_t id;
  char *payload;
} call_packet_t;
```

The CALL message is similar to the SIGNAL message with one difference: it expects a response in a reasonable amount of
time, in the form of an ACK message. Each CALL message includes a 4 byte `id`, which will be used to correlate an
incoming ACK message. If no ACK with a corresponding `id` is received within a preset timeout, the client SHOULD ignore
any future ACKs.

### `ACK(31)` packet

```c
typedef struct {
  packet_header_t header;
  uint32_t id;
  char *payload;
} ack_packet_t;
```

The ACK message is sent in response to a CALL message in the signal of a successful call. The payload represents the
result of the call. The corresponding CALL `id` field must be reserialized in the ACK message.

If an ACK message is received without a corresponding `id` internally, the receiving node SHOULD ignore the message
without disconnection.

### `ERROR(32)` packet

```c
typedef struct {
  packet_header_t header;
  uint32_t id;
  uint8_t code;
  uint8_t msg_size;
  char msg[msg_size];
} error_packet_t;
```

The ERROR message is sent in response to a CALL message in the signal of a unsuccessful call. The body includes the
corresponding CALL `id` as well as an error `code` and `msg` string. The `code` shall be interpreted by the client.

If an ERROR message is received without a corresponding `id` internally, the receiving node SHOULD ignore the message
without disconnection.

### `PING(40)` packet

```c
typedef struct {
  packet_header_t header;
  uint64_t challenge;
} ping_packet_t;
```

The PING message is used for connection keep alive and stall recognition. Each PING is serialized with an 8 byte nonce.
This nonce is to be sent back in a corresponding PONG message.

If a corresponding PONG is not received within 30 seconds, the sending client SHOULD invoke stall behavior.

### `PONG(41)` packet

```c
typedef struct {
  packet_header_t header;
  uint64_t challenge;
} pong_packet_t;
```

The PONG message is sent in response to a PING message. It includes the same 8 byte nonce from the originating PING
message.

## Stall Behavior and Misbehavior

TODO

## Initial Handshake

TODO

## DRPC over TCP sockets

TODO

## DRPC over WebSockets

TODO

## License

- Copyright (c) 2020, Yuan Tao (MIT License).
- Copyright (c) 2017, Christopher Jeffrey. (MIT License)
