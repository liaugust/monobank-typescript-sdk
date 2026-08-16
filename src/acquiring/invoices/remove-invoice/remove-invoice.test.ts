import { describe, expect, it } from "vitest";

import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import { createRemoveInvoiceBody } from "./remove-invoice.js";

describe("remove invoice contract", () => {
  it("builds a validated invoice identifier body", () => {
    expect(createRemoveInvoiceBody({ invoiceId: "invoice-42" })).toEqual({
      invoiceId: "invoice-42",
    });
  });

  it("rejects an empty invoice identifier", () => {
    expect(() => createRemoveInvoiceBody({ invoiceId: "" })).toThrow(
      MonobankValidationError,
    );
  });
});
