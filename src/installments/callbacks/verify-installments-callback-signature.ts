import { createInstallmentsSignature } from "../../transport/request/installments-signature.js";

/** Inputs required to authenticate a Покупка Частинами callback body. */
export interface VerifyInstallmentsCallbackSignatureInput {
  /** Exact raw callback request body bytes received from Monobank. */
  readonly body: ArrayBuffer | Uint8Array | string;
  /** Base64 value of the callback's `signature` header. */
  readonly signature: string;
  /** Shared secret Monobank issued for the store. */
  readonly storeSecret: string;
}

/**
 * Authenticates a Покупка Частинами callback by recomputing its body signature.
 *
 * Monobank signs callbacks with the same
 * `Base64(HMAC-SHA256(request_body_bytes, store_secret))` scheme it requires on
 * requests, so verification recomputes the signature over the exact bytes
 * received. Pass the raw body, not a re-serialized object: `JSON.parse` followed
 * by `JSON.stringify` can reorder keys and change the bytes that were signed.
 *
 * The comparison is length-independent and constant-time over the compared
 * bytes, so a caller cannot learn the expected signature by timing repeated
 * attempts.
 * @param input Raw body bytes, the `signature` header value, and the store secret.
 * @returns Whether the signature authenticates the supplied body.
 */
export async function verifyInstallmentsCallbackSignature(
  input: VerifyInstallmentsCallbackSignatureInput,
): Promise<boolean> {
  const expected = await createInstallmentsSignature(
    input.storeSecret,
    decodeBody(input.body),
  );

  return equalsInConstantTime(expected, input.signature);
}

function decodeBody(body: ArrayBuffer | Uint8Array | string): string {
  if (typeof body === "string") {
    return body;
  }

  const bytes =
    body instanceof ArrayBuffer ? new Uint8Array(body) : Uint8Array.from(body);

  return new TextDecoder().decode(bytes);
}

function equalsInConstantTime(expected: string, actual: string): boolean {
  let difference = expected.length ^ actual.length;

  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ (actual.charCodeAt(index) || 0);
  }

  return difference === 0;
}
