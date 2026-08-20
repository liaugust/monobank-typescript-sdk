import { decodeBase64 } from "../../../shared/decode-base64.js";

/**
 * Extracts SPKI bytes from Monobank's base64-encoded PEM public key.
 * @param publicKey Base64-encoded X.509 PEM public key.
 * @returns DER-encoded SPKI bytes suitable for Web Crypto import.
 */
export function decodePublicKey(publicKey: string): Uint8Array<ArrayBuffer> {
  const pem = new TextDecoder().decode(decodeBase64(publicKey));
  const encodedKey = pem
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replaceAll(/\s/g, "");

  return decodeBase64(encodedKey);
}
