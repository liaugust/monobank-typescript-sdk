import { describe, expect, it } from "vitest";

import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import type { PayInvoiceDirectInput } from "./pay-direct.js";
import { createPayInvoiceDirectBody } from "./pay-direct.js";

const cardData = {
  cvv: "123",
  exp: "0642",
  pan: "4242424242424242",
} as const;

function asInput(value: unknown): PayInvoiceDirectInput {
  return value as PayInvoiceDirectInput;
}

describe("direct payment contract", () => {
  it("builds a body from the documented fields", () => {
    expect(
      createPayInvoiceDirectBody({
        amount: 4_200,
        cardData,
        ccy: 980,
        redirectUrl: "https://example.test/done",
      }),
    ).toEqual({
      amount: 4_200,
      cardData,
      ccy: 980,
      redirectUrl: "https://example.test/done",
    });
  });

  it("drops caller fields outside the documented body", () => {
    expect(
      createPayInvoiceDirectBody(
        asInput({ amount: 4_200, cardData, secretNote: "not sent upstream" }),
      ),
    ).toEqual({ amount: 4_200, cardData });
  });

  it.each([
    { name: "missing card data", value: { amount: 4_200 } },
    {
      name: "missing pan",
      value: { amount: 4_200, cardData: { cvv: "123", exp: "0642" } },
    },
    {
      name: "empty pan",
      value: { amount: 4_200, cardData: { ...cardData, pan: "" } },
    },
    {
      name: "empty cvv",
      value: { amount: 4_200, cardData: { ...cardData, cvv: "" } },
    },
    {
      name: "fractional amount",
      value: { amount: 42.5, cardData },
    },
  ])("rejects $name before Fetch", ({ value }) => {
    expect(() => createPayInvoiceDirectBody(asInput(value))).toThrow(
      MonobankValidationError,
    );
  });

  it("never repeats card details in the validation error", () => {
    let issues: readonly string[] = [];

    try {
      createPayInvoiceDirectBody(
        asInput({ amount: 4_200, cardData: { ...cardData, cvv: "" } }),
      );
    } catch (error) {
      issues = (error as MonobankValidationError).issues;
    }

    expect(issues.length).toBeGreaterThan(0);
    expect(issues.join(" ")).not.toContain(cardData.pan);
    expect(issues.join(" ")).not.toContain(cardData.exp);
  });
});
