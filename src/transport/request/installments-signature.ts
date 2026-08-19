import { encodeBase64 } from "../../shared/encode-base64.js";

/**
 * Signs a Покупка Частинами request body with the store secret.
 *
 * Monobank documents the signature as
 * `Base64(HMAC-SHA256(request_body_bytes, store_secret))`, so the exact bytes
 * that will be sent are signed rather than a re-serialization of the same input:
 * re-encoding could reorder keys and invalidate the signature. HMAC-SHA256 is
 * available in Web Crypto, so no application-supplied signer is needed.
 * @param storeSecret Shared secret Monobank issued for the store.
 * @param body Serialized request body exactly as it will be sent.
 * @returns Base64 signature for the `signature` header.
 */
export async function createInstallmentsSignature(
  storeSecret: string,
  body: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(storeSecret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const signature = await globalThis.crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(body),
  );

  return encodeBase64(new Uint8Array(signature));
}
