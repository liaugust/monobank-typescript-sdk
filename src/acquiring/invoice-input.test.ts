import { describe, expect, it } from "vitest";

import { MonobankValidationError } from "../errors/monobank-validation-error.js";
import { DiscountMode, DiscountType, InvoicePaymentType } from "./invoice.js";
import {
  createCancelInvoiceBody,
  createFinalizeInvoiceBody,
  createInvoiceBody,
  createInvoiceFiscalChecksEndpoint,
  createInvoiceReceiptEndpoint,
  createInvoiceStatusEndpoint,
  createRemoveInvoiceBody,
} from "./invoice-input.js";

const fiscalizationItem = {
  barcode: "4820000000000",
  code: "chair-1",
  footer: "Thank you",
  header: "Order item",
  name: "Chair",
  qty: 2,
  sum: 2_100,
  tax: [1, 2],
  uktzed: "9401",
} as const;

describe("Acquiring invoice input validation", () => {
  it("builds a complete create-invoice body without dropping documented fields", () => {
    const input = {
      agentFeePercent: 1.42,
      amount: 4_200,
      ccy: 980,
      code: "terminal-code",
      merchantPaymInfo: {
        basketOrder: [
          {
            ...fiscalizationItem,
            discounts: [
              {
                mode: DiscountMode.Percent,
                type: DiscountType.Discount,
                value: 5,
              },
            ],
            icon: "https://example.test/chair.png",
            total: 4_200,
            unit: "pcs",
          },
        ],
        comment: "Website checkout",
        customerEmails: ["buyer@example.test"],
        destination: "Order 42",
        discounts: [
          {
            mode: DiscountMode.Value,
            type: DiscountType.ExtraCharge,
            value: 1.25,
          },
        ],
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

  it("rejects malformed create-invoice values", () => {
    expect(() => createInvoiceBody({ amount: 42.5 })).toThrow(
      MonobankValidationError,
    );
    expect(() =>
      createInvoiceBody({
        amount: 4_200,
        paymentType: "credit" as InvoicePaymentType,
      }),
    ).toThrow(MonobankValidationError);
    expect(() =>
      createInvoiceBody({
        amount: 4_200,
        merchantPaymInfo: { destination: "x".repeat(281) },
      }),
    ).toThrow(MonobankValidationError);
    expect(() =>
      createInvoiceBody({
        amount: 4_200,
        merchantPaymInfo: {
          customerEmails: ["buyer@example.test", "buyer@example.test"],
        },
      }),
    ).toThrow(MonobankValidationError);
  });

  it("builds cancel, remove, and finalize bodies", () => {
    expect(
      createCancelInvoiceBody({
        amount: 2_100,
        extRef: "refund-42",
        invoiceId: "invoice/42",
        items: [fiscalizationItem],
      }),
    ).toEqual({
      amount: 2_100,
      extRef: "refund-42",
      invoiceId: "invoice/42",
      items: [fiscalizationItem],
    });
    expect(createRemoveInvoiceBody({ invoiceId: "invoice-42" })).toEqual({
      invoiceId: "invoice-42",
    });
    expect(
      createFinalizeInvoiceBody({
        amount: 4_200,
        invoiceId: "invoice-42",
        items: [fiscalizationItem],
      }),
    ).toEqual({
      amount: 4_200,
      invoiceId: "invoice-42",
      items: [fiscalizationItem],
    });
  });

  it("rejects invalid lifecycle bodies", () => {
    expect(() => createCancelInvoiceBody({ invoiceId: "" })).toThrow(
      MonobankValidationError,
    );
    expect(() => createRemoveInvoiceBody({ invoiceId: "" })).toThrow(
      MonobankValidationError,
    );
    expect(() =>
      createFinalizeInvoiceBody({ amount: Number.NaN, invoiceId: "invoice" }),
    ).toThrow(MonobankValidationError);
  });

  it("encodes invoice query parameters", () => {
    expect(createInvoiceStatusEndpoint({ invoiceId: "invoice/42 ?" })).toBe(
      "/api/merchant/invoice/status?invoiceId=invoice%2F42+%3F",
    );
    expect(
      createInvoiceReceiptEndpoint({
        email: "buyer+mono@example.test",
        invoiceId: "invoice/42",
      }),
    ).toBe(
      "/api/merchant/invoice/receipt?invoiceId=invoice%2F42&email=buyer%2Bmono%40example.test",
    );
    expect(createInvoiceFiscalChecksEndpoint({ invoiceId: "invoice/42" })).toBe(
      "/api/merchant/invoice/fiscal-checks?invoiceId=invoice%2F42",
    );
  });

  it("rejects empty invoice query identifiers", () => {
    expect(() => createInvoiceStatusEndpoint({ invoiceId: "" })).toThrow(
      MonobankValidationError,
    );
    expect(() => createInvoiceReceiptEndpoint({ invoiceId: "" })).toThrow(
      MonobankValidationError,
    );
    expect(() => createInvoiceFiscalChecksEndpoint({ invoiceId: "" })).toThrow(
      MonobankValidationError,
    );
  });
});
