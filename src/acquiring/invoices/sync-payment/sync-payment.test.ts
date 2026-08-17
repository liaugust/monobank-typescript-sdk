import { describe, expect, it } from "vitest";

import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import type { SyncInvoicePaymentInput } from "./sync-payment.js";
import {
  createSyncInvoicePaymentBody,
  SyncPaymentPanType,
} from "./sync-payment.js";

const cardData = {
  eciIndicator: "02",
  exp: "0642",
  pan: "4242424242424242",
  type: SyncPaymentPanType.Fpan,
} as const;

const walletContainer = {
  cryptogram: "AQAAAAoAR9qDi9kAAAAAgGpLpoA=",
  eciIndicator: "02",
  exp: "0642",
  token: "4242424242424242",
} as const;

function asInput(value: unknown): SyncInvoicePaymentInput {
  return value as SyncInvoicePaymentInput;
}

describe("synchronous payment contract", () => {
  it.each([
    { container: { cardData }, name: "card data" },
    { container: { applePay: walletContainer }, name: "Apple Pay" },
    { container: { googlePay: walletContainer }, name: "Google Pay" },
  ])("builds a body from a $name container", ({ container }) => {
    expect(
      createSyncInvoicePaymentBody({ amount: 4_200, ccy: 980, ...container }),
    ).toEqual({ amount: 4_200, ccy: 980, ...container });
  });

  it("rejects a request without any payment container", () => {
    expect(() =>
      createSyncInvoicePaymentBody({ amount: 4_200, ccy: 980 }),
    ).toThrow(
      expect.objectContaining({
        issues: [
          "exactly one of applePay, cardData, or googlePay must be supplied",
        ],
      }),
    );
  });

  it("rejects a request carrying more than one payment container", () => {
    expect(() =>
      createSyncInvoicePaymentBody({
        amount: 4_200,
        applePay: walletContainer,
        cardData,
        ccy: 980,
      }),
    ).toThrow(MonobankValidationError);
  });

  it.each([
    {
      name: "undocumented pan type",
      value: {
        amount: 4_200,
        cardData: { ...cardData, type: "OTHER" },
        ccy: 980,
      },
    },
    {
      name: "missing eci indicator",
      value: {
        amount: 4_200,
        applePay: { exp: "0642", token: "4242424242424242" },
        ccy: 980,
      },
    },
    { name: "missing currency", value: { amount: 4_200, cardData } },
  ])("rejects $name before Fetch", ({ value }) => {
    expect(() => createSyncInvoicePaymentBody(asInput(value))).toThrow(
      MonobankValidationError,
    );
  });

  it("drops caller fields outside the documented body", () => {
    expect(
      createSyncInvoicePaymentBody(
        asInput({
          amount: 4_200,
          cardData,
          ccy: 980,
          secretNote: "not sent upstream",
        }),
      ),
    ).toEqual({ amount: 4_200, cardData, ccy: 980 });
  });
});
