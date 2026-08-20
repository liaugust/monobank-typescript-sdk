import { MonobankValidationError } from "../../errors/monobank-validation-error.js";
import { decodeBase64 } from "../../shared/decode-base64.js";
import { computeInstallmentsHmac } from "../../transport/request/installments-signature.js";

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
 * The body is hashed directly from its original bytes with no intermediate
 * string round trip.
 *
 * The comparison is length-independent and constant-time over the compared
 * bytes, so a caller cannot learn the expected signature by timing repeated
 * attempts. A malformed (non-base64) `signature` is treated as a mismatch
 * rather than thrown, so this function never throws on attacker-controlled
 * input.
 * @param input Raw body bytes, the `signature` header value, and the store secret.
 * @returns Whether the signature authenticates the supplied body.
 * @throws {MonobankValidationError} When `storeSecret` is empty.
 */
export async function verifyInstallmentsCallbackSignature(
  input: VerifyInstallmentsCallbackSignatureInput,
): Promise<boolean> {
  if (input.storeSecret.length === 0) {
    throw new MonobankValidationError({
      endpoint: "verify-installments-callback-signature",
      issues: ["storeSecret must be a nonempty string"],
      message: "Invalid Installments callback verification input.",
    });
  }

  const expected = await computeInstallmentsHmac(
    input.storeSecret,
    toBytes(input.body),
  );
  const actual = decodeSignature(input.signature);

  return equalsInConstantTime(expected, actual);
}

function toBytes(
  body: ArrayBuffer | Uint8Array | string,
): Uint8Array<ArrayBuffer> {
  if (typeof body === "string") {
    return new TextEncoder().encode(body);
  }

  return body instanceof ArrayBuffer
    ? new Uint8Array(body)
    : Uint8Array.from(body);
}

function decodeSignature(signature: string): Uint8Array {
  try {
    return decodeBase64(signature);
  } catch {
    return new Uint8Array(0);
  }
}

function equalsInConstantTime(
  expected: Uint8Array,
  actual: Uint8Array,
): boolean {
  let difference = expected.length ^ actual.length;

  for (const [index, value] of expected.entries()) {
    difference |= value ^ (actual[index] ?? 0);
  }

  return difference === 0;
}
