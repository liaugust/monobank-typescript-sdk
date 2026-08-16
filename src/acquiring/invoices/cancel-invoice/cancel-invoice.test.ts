import { describe, expect, it } from "vitest";

import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import { cancelInvoiceResponseSchema } from "../models/invoice-cancellation.js";
import { createCancelInvoiceBody } from "./cancel-invoice.js";

describe("cancel invoice contract", () => {
  it("builds cancellation bodies with fiscalization items", () => {
    const input = {
      amount: 2_100,
      extRef: "refund-42",
      invoiceId: "invoice-42",
      items: [{ code: "chair-1", name: "Chair", qty: 1, sum: 2_100 }],
    } as const;

    expect(createCancelInvoiceBody(input)).toEqual(input);
  });

  it("rejects invalid cancellation input", () => {
    expect(() => createCancelInvoiceBody({ invoiceId: "" })).toThrow(
      MonobankValidationError,
    );
  });

  it("parses cancellation responses and rejects malformed timestamps", () => {
    const response = {
      createdDate: "2026-08-16T12:00:00Z",
      modifiedDate: "2026-08-16T12:01:00Z",
      status: "processing",
    } as const;

    expect(cancelInvoiceResponseSchema.parse(response)).toEqual(response);
    expect(
      cancelInvoiceResponseSchema.safeParse({
        ...response,
        createdDate: "invalid",
      }).success,
    ).toBe(false);
  });
});
