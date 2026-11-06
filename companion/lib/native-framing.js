'use strict';

// Chromium Native Messaging framing: each message is UTF-8 JSON preceded by a
// 32-bit length in native byte order. Host-to-browser messages are capped at
// 1 MB by Chromium.

const os = require('node:os');

const MAX_TO_BROWSER = 1024 * 1024;
const MAX_FROM_BROWSER = 8 * 1024 * 1024;
const LITTLE_ENDIAN = os.endianness() === 'LE';

function encodeMessage(message) {
  const body = Buffer.from(JSON.stringify(message), 'utf8');
  if (body.length > MAX_TO_BROWSER) {
    const error = new Error(`Native message is ${body.length} bytes; the browser accepts at most ${MAX_TO_BROWSER}.`);
    error.code = 'message_too_large';
    throw error;
  }
  const header = Buffer.alloc(4);
  if (LITTLE_ENDIAN) header.writeUInt32LE(body.length, 0);
  else header.writeUInt32BE(body.length, 0);
  return Buffer.concat([header, body]);
}

class NativeMessageReader {
  constructor(onMessage, { maxBytes = MAX_FROM_BROWSER, onError = () => {} } = {}) {
    this.onMessage = onMessage;
    this.onError = onError;
    this.maxBytes = maxBytes;
    this.buffer = Buffer.alloc(0);
  }

  push(chunk) {
    this.buffer = this.buffer.length ? Buffer.concat([this.buffer, chunk]) : Buffer.from(chunk);
    for (;;) {
      if (this.buffer.length < 4) return;
      const length = LITTLE_ENDIAN ? this.buffer.readUInt32LE(0) : this.buffer.readUInt32BE(0);
      if (length > this.maxBytes) {
        this.buffer = Buffer.alloc(0);
        this.onError(Object.assign(new Error(`Incoming native message of ${length} bytes is too large.`), { code: 'message_too_large' }));
        return;
      }
      if (this.buffer.length < 4 + length) return;
      const body = this.buffer.subarray(4, 4 + length).toString('utf8');
      this.buffer = this.buffer.subarray(4 + length);
      let message;
      try {
        message = JSON.parse(body);
      } catch (error) {
        this.onError(Object.assign(new Error('Incoming native message is not JSON.'), { code: 'message_not_json' }));
        continue;
      }
      this.onMessage(message);
    }
  }
}

module.exports = { MAX_TO_BROWSER, encodeMessage, NativeMessageReader };
