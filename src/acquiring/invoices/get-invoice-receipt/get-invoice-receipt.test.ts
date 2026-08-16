import { describe, expect, it } from "vitest";

import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import {
  createInvoiceReceiptEndpoint,
  receiptSchema,
} from "./get-invoice-receipt.js";

describe("get invoice receipt contract", () => {
  it("encodes the identifier and optional email", () => {
    expect(
      createInvoiceReceiptEndpoint({
        email: "buyer+mono@example.test",
        invoiceId: "invoice/42",
      }),
    ).toBe(
      "/api/merchant/invoice/receipt?invoiceId=invoice%2F42&email=buyer%2Bmono%40example.test",
    );
    expect(() => createInvoiceReceiptEndpoint({ invoiceId: "" })).toThrow(
      MonobankValidationError,
    );
  });

  it("parses receipt responses while preserving additions", () => {
    const response = { file: "base64-pdf", upstreamAddition: true } as const;

    expect(receiptSchema.parse(response)).toEqual(response);
  });
});
