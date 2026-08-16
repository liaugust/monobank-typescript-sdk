import { describe, expect, it } from "vitest";

import { validAcquiringWebhookSignatureFixture } from "../../../../tests/fixtures/acquiring/webhooks.js";
import {
  captureRejection,
  containsStringRecursively,
} from "../../../../tests/support/transport.js";
import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import { verifyAcquiringWebhookSignature } from "./verify-acquiring-webhook-signature.js";

describe("verifyAcquiringWebhookSignature", () => {
  it("authenticates a real DER-encoded P-256 signature over the exact body bytes", async () => {
    const body = new TextEncoder().encode(
      validAcquiringWebhookSignatureFixture.body,
    );

    await expect(
      verifyAcquiringWebhookSignature({
        body,
        publicKey: validAcquiringWebhookSignatureFixture.publicKey,
        signature: validAcquiringWebhookSignatureFixture.signature,
      }),
    ).resolves.toBe(true);
  });

  it("returns false when the raw webhook body bytes have changed", async () => {
    const body = new TextEncoder().encode(
      `${validAcquiringWebhookSignatureFixture.body} `,
    );

    await expect(
      verifyAcquiringWebhookSignature({
        body,
        publicKey: validAcquiringWebhookSignatureFixture.publicKey,
        signature: validAcquiringWebhookSignatureFixture.signature,
      }),
    ).resolves.toBe(false);
  });

  it("accepts ArrayBuffer bodies returned by standard Fetch requests", async () => {
    const encodedBody = new TextEncoder().encode(
      validAcquiringWebhookSignatureFixture.body,
    );

    await expect(
      verifyAcquiringWebhookSignature({
        body: encodedBody.buffer,
        publicKey: validAcquiringWebhookSignatureFixture.publicKey,
        signature: validAcquiringWebhookSignatureFixture.signature,
      }),
    ).resolves.toBe(true);
  });

  it("rejects malformed base64 signatures with a safe validation error", async () => {
    const body = new TextEncoder().encode(
      validAcquiringWebhookSignatureFixture.body,
    );

    await expect(
      verifyAcquiringWebhookSignature({
        body,
        publicKey: validAcquiringWebhookSignatureFixture.publicKey,
        signature: "not base64!",
      }),
    ).rejects.toMatchObject({
      endpoint: "verify-acquiring-webhook-signature",
      issues: ["signature must be a base64-encoded ASN.1 DER value"],
      name: MonobankValidationError.name,
    });
  });

  it("rejects malformed public keys with a safe validation error", async () => {
    const body = new TextEncoder().encode(
      validAcquiringWebhookSignatureFixture.body,
    );

    await expect(
      verifyAcquiringWebhookSignature({
        body,
        publicKey: "not base64!",
        signature: validAcquiringWebhookSignatureFixture.signature,
      }),
    ).rejects.toMatchObject({
      endpoint: "verify-acquiring-webhook-signature",
      issues: ["publicKey must be a base64-encoded X.509 ECDSA public key"],
      name: MonobankValidationError.name,
    });
  });

  it("rejects structurally malformed DER signatures", async () => {
    const body = new TextEncoder().encode(
      validAcquiringWebhookSignatureFixture.body,
    );

    await expect(
      verifyAcquiringWebhookSignature({
        body,
        publicKey: validAcquiringWebhookSignatureFixture.publicKey,
        signature: "MAA=",
      }),
    ).rejects.toMatchObject({
      endpoint: "verify-acquiring-webhook-signature",
      issues: ["signature must be a base64-encoded ASN.1 DER value"],
      name: MonobankValidationError.name,
    });
  });

  it("does not retain malformed signature input in validation errors", async () => {
    const sensitiveSignature = "do-not-retain-this-signature!";
    const error = await captureRejection(
      verifyAcquiringWebhookSignature({
        body: new TextEncoder().encode(
          validAcquiringWebhookSignatureFixture.body,
        ),
        publicKey: validAcquiringWebhookSignatureFixture.publicKey,
        signature: sensitiveSignature,
      }),
    );

    expect(containsStringRecursively(error, sensitiveSignature)).toBe(false);
  });
});
