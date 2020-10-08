const TABLE = createTable();

function createTable() {
  const tbl = new Int32Array(256);
  let i, j, n;

  for (i = 0; i < 256; i++) {
    n = i;
    for (j = 0; j < 8; j++) {
      if (n & 1) n = (n >>> 1) ^ 0xedb88320;
      else n >>>= 1;
    }
    tbl[i] = n;
  }

  return tbl;
}

export function crc32(data: ArrayLike<any>) {
  const trailing = data.length % 4;
  const len = data.length - trailing;
  const T = TABLE;

  let hash = 0xffffffff;
  let i = 0;

  while (i < len) {
    hash = (hash >>> 8) ^ T[(hash ^ data[i++]) & 0xff];
    hash = (hash >>> 8) ^ T[(hash ^ data[i++]) & 0xff];
    hash = (hash >>> 8) ^ T[(hash ^ data[i++]) & 0xff];
    hash = (hash >>> 8) ^ T[(hash ^ data[i++]) & 0xff];
  }

  switch (trailing) {
    case 3:
      hash = (hash >>> 8) ^ T[(hash ^ data[i++]) & 0xff];
      break;
    case 2:
      hash = (hash >>> 8) ^ T[(hash ^ data[i++]) & 0xff];
      break;
    case 1:
      hash = (hash >>> 8) ^ T[(hash ^ data[i++]) & 0xff];
      break;
  }

  hash ^= 0xffffffff;

  return hash >>> 0;
}
