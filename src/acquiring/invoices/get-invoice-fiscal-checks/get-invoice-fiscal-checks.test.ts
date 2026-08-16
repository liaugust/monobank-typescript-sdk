import { describe, expect, it } from "vitest";

import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import {
  createInvoiceFiscalChecksEndpoint,
  FiscalCheckStatus,
  FiscalCheckType,
  FiscalizationSource,
  invoiceFiscalChecksSchema,
} from "./get-invoice-fiscal-checks.js";

describe("get invoice fiscal checks contract", () => {
  it("encodes invoice identifiers", () => {
    expect(createInvoiceFiscalChecksEndpoint({ invoiceId: "invoice/42" })).toBe(
      "/api/merchant/invoice/fiscal-checks?invoiceId=invoice%2F42",
    );
    expect(() => createInvoiceFiscalChecksEndpoint({ invoiceId: "" })).toThrow(
      MonobankValidationError,
    );
  });

  it("parses fiscal checks with documented enum values", () => {
    const response = {
      checks: [
        {
          file: "base64-pdf",
          fiscalizationSource: FiscalizationSource.Monopay,
          id: "check-42",
          status: FiscalCheckStatus.Done,
          taxUrl: "https://cabinet.tax.gov.ua/cashregs/check",
          type: FiscalCheckType.Sale,
        },
      ],
    } as const;

    expect(invoiceFiscalChecksSchema.parse(response)).toEqual(response);
    expect(invoiceFiscalChecksSchema.safeParse({ checks: [{}] }).success).toBe(
      false,
    );
  });
});
