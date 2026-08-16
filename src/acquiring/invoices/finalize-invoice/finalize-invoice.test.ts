import { describe, expect, it } from "vitest";

import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import {
  createFinalizeInvoiceBody,
  finalizeInvoiceResponseSchema,
} from "./finalize-invoice.js";

describe("finalize invoice contract", () => {
  it("builds a hold-finalization body", () => {
    const input = {
      amount: 4_200,
      invoiceId: "invoice-42",
      items: [{ code: "desk-1", name: "Desk", qty: 1, sum: 4_200 }],
    } as const;

    expect(createFinalizeInvoiceBody(input)).toEqual(input);
  });

  it("rejects invalid input and response status", () => {
    expect(() =>
      createFinalizeInvoiceBody({ amount: Number.NaN, invoiceId: "invoice" }),
    ).toThrow(MonobankValidationError);
    expect(finalizeInvoiceResponseSchema.parse({ status: "success" })).toEqual({
      status: "success",
    });
    expect(
      finalizeInvoiceResponseSchema.safeParse({ status: "processing" }).success,
    ).toBe(false);
  });
});
