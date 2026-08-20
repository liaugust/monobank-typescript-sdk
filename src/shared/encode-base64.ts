// `String.fromCharCode(...chunk)` is spread as call arguments, which some
// engines cap; chunking keeps every call well under that limit regardless of
// input size (a signature or digest is a few dozen bytes, but this also runs
// on binary letter downloads that can be much larger).
const chunkSize = 0x8000;

/**
 * Encodes bytes as standard base64.
 *
 * Built on `btoa` rather than `Buffer` so the same code runs in Node and in a
 * browser bundle, which the package supports as one entry point. Bytes are
 * converted to a binary string in fixed-size chunks rather than one
 * character at a time, since this runs on every signed request and
 * signature verification.
 * @param bytes Raw bytes to encode.
 * @returns Standard base64 text with padding.
 */
export function encodeBase64(bytes: Uint8Array): string {
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}
