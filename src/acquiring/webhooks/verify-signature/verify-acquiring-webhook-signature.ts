import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import { decodeBase64 } from "../../../shared/decode-base64.js";
import { decodePublicKey } from "./decode-public-key.js";
import { convertDerEcdsaSignature } from "./der-ecdsa-signature.js";

/** Inputs required to authenticate an Acquiring webhook request body. */
export interface VerifyAcquiringWebhookSignatureInput {
  /** Exact raw webhook request body bytes received from Monobank. */
  readonly body: ArrayBuffer | Uint8Array;
  /**
   * Base64-encoded X.509 ECDSA public key returned by `webhooks.getPublicKey()`,
   * or an already-imported `CryptoKey` from `importAcquiringWebhookPublicKey()`.
   *
   * A high-throughput webhook receiver should import the key once with
   * `importAcquiringWebhookPublicKey()` and pass the resulting `CryptoKey` here
   * on every subsequent call, instead of re-parsing the same PEM/SPKI value on
   * every incoming event.
   */
  readonly publicKey: CryptoKey | string;
  /** Base64-encoded ASN.1 DER signature from the webhook `X-Sign` header. */
  readonly signature: string;
}

/**
 * Imports Monobank's base64-encoded X.509 ECDSA webhook public key once, for reuse.
 *
 * Pass the result to `verifyAcquiringWebhookSignature()`'s `publicKey` on every
 * subsequent call instead of the original string, so the key is not re-parsed
 * and re-imported for every incoming webhook.
 * @param publicKey Base64-encoded X.509 ECDSA public key returned by `webhooks.getPublicKey()`.
 * @returns An imported, reusable `CryptoKey`.
 * @throws {MonobankValidationError} When the public key is malformed.
 */
export async function importAcquiringWebhookPublicKey(
  publicKey: string,
): Promise<CryptoKey> {
  try {
    return await globalThis.crypto.subtle.importKey(
      "spki",
      decodePublicKey(publicKey),
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
  } catch {
    throw new MonobankValidationError({
      endpoint: "verify-acquiring-webhook-signature",
      issues: ["publicKey must be a base64-encoded X.509 ECDSA public key"],
      message: "Invalid Acquiring webhook verification input.",
    });
  }
}

/**
 * Authenticates the exact raw bytes of an Acquiring webhook using built-in Web Crypto.
 * @param input Raw body bytes, the base64 public key or a pre-imported `CryptoKey`, and the `X-Sign` header value.
 * @returns Whether the signature authenticates the supplied body.
 * @throws {MonobankValidationError} When the public key or signature is malformed.
 */
export async function verifyAcquiringWebhookSignature(
  input: VerifyAcquiringWebhookSignatureInput,
): Promise<boolean> {
  const publicKey =
    typeof input.publicKey === "string"
      ? await importAcquiringWebhookPublicKey(input.publicKey)
      : input.publicKey;
  const body =
    input.body instanceof ArrayBuffer
      ? new Uint8Array(input.body.slice(0))
      : Uint8Array.from(input.body);
  const signature = decodeSignature(input.signature);

  return await globalThis.crypto.subtle.verify(
    { hash: "SHA-256", name: "ECDSA" },
    publicKey,
    signature,
    body,
  );
}

function decodeSignature(signature: string): Uint8Array<ArrayBuffer> {
  try {
    return convertDerEcdsaSignature(decodeBase64(signature));
  } catch {
    throw new MonobankValidationError({
      endpoint: "verify-acquiring-webhook-signature",
      issues: ["signature must be a base64-encoded ASN.1 DER value"],
      message: "Invalid Acquiring webhook verification input.",
    });
  }
}
