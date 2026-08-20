import { encodeBase64 } from "../../shared/encode-base64.js";

const encoder = new TextEncoder();

/**
 * Cache of imported, non-extractable HMAC keys keyed by the raw secret string.
 *
 * A transport has one fixed `storeSecret` for its lifetime, yet signing runs on
 * every outgoing request and verification runs on every inbound callback, so
 * without this cache the same key material is re-imported from raw bytes on
 * every call. Cardinality is bounded by the number of distinct store secrets a
 * process actually uses, which in practice is one or a handful.
 */
const hmacKeyCache = new Map<string, Promise<CryptoKey>>();

function importHmacKey(storeSecret: string): Promise<CryptoKey> {
  const cached = hmacKeyCache.get(storeSecret);

  if (cached !== undefined) {
    return cached;
  }

  const imported = globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(storeSecret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );

  hmacKeyCache.set(storeSecret, imported);

  return imported;
}

/**
 * Computes the raw HMAC-SHA256 digest bytes for a Покупка Частинами payload.
 *
 * Shared by request signing and callback verification so both sign the exact
 * bytes that were (or will be) sent, with no intermediate re-encoding.
 * @param storeSecret Shared secret Monobank issued for the store.
 * @param bodyBytes Exact request or callback body bytes.
 * @returns Raw HMAC-SHA256 digest bytes.
 */
export async function computeInstallmentsHmac(
  storeSecret: string,
  bodyBytes: Uint8Array<ArrayBuffer>,
): Promise<Uint8Array> {
  const key = await importHmacKey(storeSecret);
  const signature = await globalThis.crypto.subtle.sign("HMAC", key, bodyBytes);

  return new Uint8Array(signature);
}

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
  const digest = await computeInstallmentsHmac(
    storeSecret,
    encoder.encode(body),
  );

  return encodeBase64(digest);
}
