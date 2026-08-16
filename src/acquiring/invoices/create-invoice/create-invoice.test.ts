import { describe, expect, it } from "vitest";

import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import { DiscountMode, DiscountType } from "../models/invoice-discount.js";
import { InvoicePaymentType } from "../models/invoice-payment-info.js";
import {
  createInvoiceBody,
  createInvoiceHeaders,
  newInvoiceSchema,
} from "./create-invoice.js";

describe("create invoice contract", () => {
  it("builds a complete body without dropping documented fields", () => {
    const input = {
      agentFeePercent: 1.42,
      amount: 4_200,
      ccy: 980,
      code: "terminal-code",
      merchantPaymInfo: {
        basketOrder: [
          {
            barcode: "4820000000000",
            code: "chair-1",
            discounts: [
              {
                mode: DiscountMode.Percent,
                type: DiscountType.Discount,
                value: 5,
              },
            ],
            name: "Chair",
            qty: 2,
            sum: 2_100,
            total: 4_200,
          },
        ],
        customerEmails: ["buyer@example.test"],
        destination: "Order 42",
        reference: "order-42",
      },
      paymentType: InvoicePaymentType.Hold,
      qrId: "cash-register-1",
      redirectUrl: "https://example.test/payment-result",
      saveCardData: { saveCard: true, walletId: "customer-42" },
      tipsEmployeeId: "employee-7",
      validity: 3_600,
      webHookUrl: "https://example.test/webhooks/monobank",
    } as const;

    expect(createInvoiceBody(input)).toEqual(input);
  });

  it("validates input and CMS attribution", () => {
    expect(createInvoiceHeaders({ cms: "Shop", cmsVersion: "1.2.3" })).toEqual({
      "X-Cms": "Shop",
      "X-Cms-Version": "1.2.3",
    });
    expect(createInvoiceHeaders(undefined)).toEqual({});
    expect(() => createInvoiceHeaders({ cms: "" })).toThrow(
      MonobankValidationError,
    );
    expect(() => createInvoiceBody({ amount: 42.5 })).toThrow(
      MonobankValidationError,
    );
    expect(() =>
      createInvoiceBody({
        amount: 4_200,
        merchantPaymInfo: {
          customerEmails: ["buyer@example.test", "buyer@example.test"],
        },
      }),
    ).toThrow(MonobankValidationError);
  });

  it("parses create responses while preserving additive fields", () => {
    const response = {
      invoiceId: "invoice-42",
      pageUrl: "https://pay.example.test/invoice-42",
      upstreamAddition: true,
    } as const;

    expect(newInvoiceSchema.parse(response)).toEqual(response);
    expect(
      newInvoiceSchema.safeParse({ invoiceId: "invoice-42" }).success,
    ).toBe(false);
  });
});
