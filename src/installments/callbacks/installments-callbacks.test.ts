import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { installmentsTestStoreSecret } from "../../../tests/support/installments-client.js";
import { MonobankValidationError } from "../../errors/monobank-validation-error.js";
import { parseInstallmentsCallbackEvent } from "./installments-callback-event.js";
import { verifyInstallmentsCallbackSignature } from "./verify-installments-callback-signature.js";

const body = JSON.stringify({
  order_id: "fa4a8249-336e-4e6d-9b85-79bc8be62377",
  order_sub_state: "WAITING_FOR_STORE_CONFIRM",
  state: "IN_PROCESS",
});

function sign(payload: string, secret = installmentsTestStoreSecret): string {
  return createHmac("sha256", secret).update(payload).digest("base64");
}

describe("verifyInstallmentsCallbackSignature", () => {
  it("authenticates a callback Monobank signed", async () => {
    await expect(
      verifyInstallmentsCallbackSignature({
        body,
        signature: sign(body),
        storeSecret: installmentsTestStoreSecret,
      }),
    ).resolves.toBe(true);
  });

  it("accepts the raw bytes in every documented form", async () => {
    const bytes = new TextEncoder().encode(body);

    for (const candidate of [body, bytes, bytes.buffer]) {
      await expect(
        verifyInstallmentsCallbackSignature({
          body: candidate,
          signature: sign(body),
          storeSecret: installmentsTestStoreSecret,
        }),
      ).resolves.toBe(true);
    }
  });

  it("refuses a body altered after signing", async () => {
    const tampered = body.replace("IN_PROCESS", "SUCCESS");

    await expect(
      verifyInstallmentsCallbackSignature({
        body: tampered,
        signature: sign(body),
        storeSecret: installmentsTestStoreSecret,
      }),
    ).resolves.toBe(false);
  });

  it("refuses a signature made with another secret", async () => {
    await expect(
      verifyInstallmentsCallbackSignature({
        body,
        signature: sign(body, "someone-elses-secret"),
        storeSecret: installmentsTestStoreSecret,
      }),
    ).resolves.toBe(false);
  });

  it("refuses a truncated and an overlong signature", async () => {
    const signature = sign(body);

    for (const candidate of [signature.slice(0, -4), `${signature}AAAA`, ""]) {
      await expect(
        verifyInstallmentsCallbackSignature({
          body,
          signature: candidate,
          storeSecret: installmentsTestStoreSecret,
        }),
      ).resolves.toBe(false);
    }
  });
});

describe("parseInstallmentsCallbackEvent", () => {
  it("validates a terminal-state callback", () => {
    const payload = {
      order_id: "fa4a8249-336e-4e6d-9b85-79bc8be62377",
      order_sub_state: "SUCCESS",
      state: "SUCCESS",
    };

    expect(parseInstallmentsCallbackEvent(payload)).toEqual(payload);
  });

  it("accepts a callback carrying only the order identifier", () => {
    expect(parseInstallmentsCallbackEvent({ order_id: "order-42" })).toEqual({
      order_id: "order-42",
    });
  });

  it("preserves additive callback fields", () => {
    const payload = { order_id: "order-42", upstreamAddition: true };

    expect(parseInstallmentsCallbackEvent(payload)).toEqual(payload);
  });

  it("rejects a callback without an order identifier", () => {
    expect(() => parseInstallmentsCallbackEvent({ state: "SUCCESS" })).toThrow(
      MonobankValidationError,
    );
    expect(() => parseInstallmentsCallbackEvent(undefined)).toThrow(
      MonobankValidationError,
    );
  });
});
