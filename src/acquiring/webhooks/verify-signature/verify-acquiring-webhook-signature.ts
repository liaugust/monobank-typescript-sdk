import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import { decodeBase64 } from "./decode-base64.js";
import { decodePublicKey } from "./decode-public-key.js";
import { convertDerEcdsaSignature } from "./der-ecdsa-signature.js";

/** Inputs required to authenticate an Acquiring webhook request body. */
export interface VerifyAcquiringWebhookSignatureInput {
  /** Exact raw webhook request body bytes received from Monobank. */
  readonly body: ArrayBuffer | Uint8Array;
  /** Base64-encoded X.509 ECDSA public key returned by `webhooks.getPublicKey()`. */
  readonly publicKey: string;
  /** Base64-encoded ASN.1 DER signature from the webhook `X-Sign` header. */
  readonly signature: string;
}

/**
 * Authenticates the exact raw bytes of an Acquiring webhook using built-in Web Crypto.
 * @param input Raw body bytes, cached public key, and `X-Sign` header value.
 * @returns Whether the signature authenticates the supplied body.
 * @throws {MonobankValidationError} When the public key or signature is malformed.
 */
export async function verifyAcquiringWebhookSignature(
  input: VerifyAcquiringWebhookSignatureInput,
): Promise<boolean> {
  const publicKey = await importPublicKey(input.publicKey);
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

async function importPublicKey(publicKey: string): Promise<CryptoKey> {
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
