/**
 * Encodes bytes as standard base64.
 *
 * Built on `btoa` rather than `Buffer` so the same code runs in Node and in a
 * browser bundle, which the package supports as one entry point.
 * @param bytes Raw bytes to encode.
 * @returns Standard base64 text with padding.
 */
export function encodeBase64(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}
