/**
 * Decodes a base64 value without relying on Node-only globals.
 * @param value Base64-encoded bytes.
 * @returns Decoded bytes backed by an ordinary `ArrayBuffer`.
 */
export function decodeBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}
