import { describe, expect, it } from "vitest";

import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import { DiscountMode, DiscountType } from "../models/invoice-discount.js";
import { InvoiceDisplayType } from "../models/invoice-display-type.js";
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
      displayType: InvoiceDisplayType.Iframe,
      failUrl: "https://example.test/payment-failed",
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
            splitReceiverId: "a1b2c3d4e5f6",
            sum: 2_100,
            total: 4_200,
          },
        ],
        customerEmails: ["buyer@example.test"],
        destination: "Order 42",
        metadata: { key1: "value1", key2: "value2" },
        reference: "order-42",
      },
      paymentType: InvoicePaymentType.Hold,
      qrId: "cash-register-1",
      redirectUrl: "https://example.test/payment-result",
      saveCardData: { saveCard: true, walletId: "customer-42" },
      successUrl: "https://example.test/payment-succeeded",
      tipsEmployeeId: "employee-7",
      validity: 3_600,
      webHookUrl: "https://example.test/webhooks/monobank",
      withAppUrl: true,
    } as const;

    expect(createInvoiceBody(input)).toEqual(input);
  });

  it("keeps every documented field addressable by name", () => {
    const body = createInvoiceBody({
      amount: 4_200,
      displayType: InvoiceDisplayType.Iframe,
      failUrl: "https://example.test/payment-failed",
      merchantPaymInfo: {
        basketOrder: [
          {
            code: "chair-1",
            name: "Chair",
            qty: 1,
            splitReceiverId: "a1b2c3d4e5f6",
            sum: 4_200,
          },
        ],
        metadata: { orderId: "order-42" },
      },
      successUrl: "https://example.test/payment-succeeded",
      withAppUrl: true,
    });

    expect(Object.keys(body).sort()).toEqual([
      "amount",
      "displayType",
      "failUrl",
      "merchantPaymInfo",
      "successUrl",
      "withAppUrl",
    ]);
    expect(body.merchantPaymInfo?.metadata).toEqual({ orderId: "order-42" });
    expect(body.merchantPaymInfo?.basketOrder?.[0]?.splitReceiverId).toBe(
      "a1b2c3d4e5f6",
    );
  });

  it("forwards a metadata value the documented sample does not show", () => {
    const body = createInvoiceBody({
      amount: 4_200,
      merchantPaymInfo: { metadata: { attempt: 2, tags: ["a", "b"] } },
    });

    expect(body.merchantPaymInfo?.metadata).toEqual({
      attempt: 2,
      tags: ["a", "b"],
    });
  });

  it("accepts a verification payment only under its documented conditions", () => {
    const verification = {
      amount: 0,
      paymentType: InvoicePaymentType.Verification,
      saveCardData: { saveCard: true },
    } as const;

    expect(createInvoiceBody(verification)).toEqual(verification);
    expect(() => createInvoiceBody({ ...verification, amount: 4_200 })).toThrow(
      MonobankValidationError,
    );
    expect(() =>
      createInvoiceBody({
        amount: 0,
        paymentType: InvoicePaymentType.Verification,
        saveCardData: { saveCard: false },
      }),
    ).toThrow(MonobankValidationError);
    expect(() =>
      createInvoiceBody({
        amount: 0,
        paymentType: InvoicePaymentType.Verification,
      }),
    ).toThrow(MonobankValidationError);
    expect(
      createInvoiceBody({ amount: 0, paymentType: InvoicePaymentType.Debit }),
    ).toEqual({ amount: 0, paymentType: InvoicePaymentType.Debit });
  });

  it("rejects an undocumented display type", () => {
    expect(() =>
      createInvoiceBody({
        amount: 4_200,
        displayType: "modal" as unknown as InvoiceDisplayType,
      }),
    ).toThrow(MonobankValidationError);
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
      appUrl: "monobank://pay/invoice-42",
      invoiceId: "invoice-42",
      pageUrl: "https://pay.example.test/invoice-42",
      upstreamAddition: true,
    } as const;

    expect(newInvoiceSchema.parse(response)).toEqual(response);
    expect(
      newInvoiceSchema.parse({
        invoiceId: "invoice-42",
        pageUrl: "https://pay.example.test/invoice-42",
      }).appUrl,
    ).toBeUndefined();
    expect(
      newInvoiceSchema.safeParse({ invoiceId: "invoice-42" }).success,
    ).toBe(false);
  });
});
