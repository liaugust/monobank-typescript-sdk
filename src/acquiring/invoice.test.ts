import { describe, expect, it } from "vitest";

import {
  cancelInvoiceResponseSchema,
  finalizeInvoiceResponseSchema,
  FiscalCheckStatus,
  FiscalCheckType,
  FiscalizationSource,
  invoiceFiscalChecksSchema,
  InvoicePaymentMethod,
  InvoicePaymentSystem,
  InvoiceStatus,
  invoiceStatusSchema,
  InvoiceWalletStatus,
  newInvoiceSchema,
  receiptSchema,
} from "./invoice.js";

const invoiceStatusFixture = {
  amount: 4_200,
  cancelList: [
    {
      amount: 2_100,
      approvalCode: "662476",
      ccy: 980,
      createdDate: "2026-08-16T12:00:00Z",
      extRef: "refund-42",
      modifiedDate: "2026-08-16T12:01:00Z",
      rrn: "060189181768",
      status: "success",
    },
  ],
  ccy: 980,
  createdDate: "2026-08-16T11:00:00Z",
  destination: "Order 42",
  errCode: "",
  failureReason: "",
  finalAmount: 4_200,
  invoiceId: "invoice-42",
  modifiedDate: "2026-08-16T11:01:00Z",
  paymentInfo: {
    agentFee: 42,
    approvalCode: "662476",
    bank: "Universal Bank",
    country: "804",
    fee: 63,
    maskedPan: "444403******1902",
    paymentMethod: InvoicePaymentMethod.Apple,
    paymentSystem: InvoicePaymentSystem.Visa,
    rrn: "060189181768",
    terminal: "MI001088",
    tranId: "transaction-42",
  },
  reference: "order-42",
  status: InvoiceStatus.Success,
  tipsInfo: { amount: 420, employeeId: "employee-7" },
  walletData: {
    cardToken: "card-token",
    status: InvoiceWalletStatus.Created,
    walletId: "customer-42",
  },
} as const;

describe("Acquiring invoice response schemas", () => {
  it("parses create and receipt responses while preserving additions", () => {
    expect(
      newInvoiceSchema.parse({
        invoiceId: "invoice-42",
        pageUrl: "https://pay.example.test/invoice-42",
        upstreamAddition: true,
      }),
    ).toEqual({
      invoiceId: "invoice-42",
      pageUrl: "https://pay.example.test/invoice-42",
      upstreamAddition: true,
    });
    expect(receiptSchema.parse({ file: "base64-pdf" })).toEqual({
      file: "base64-pdf",
    });
  });

  it("parses a complete invoice status", () => {
    expect(invoiceStatusSchema.parse(invoiceStatusFixture)).toEqual(
      invoiceStatusFixture,
    );
  });

  it("accepts a minimal invoice status and rejects unknown enum values", () => {
    expect(
      invoiceStatusSchema.parse({
        amount: 4_200,
        ccy: 980,
        invoiceId: "invoice-42",
        status: InvoiceStatus.Created,
      }),
    ).toEqual({
      amount: 4_200,
      ccy: 980,
      invoiceId: "invoice-42",
      status: "created",
    });
    expect(
      invoiceStatusSchema.safeParse({
        ...invoiceStatusFixture,
        status: "unknown",
      }).success,
    ).toBe(false);
  });

  it("parses cancellation and finalization responses", () => {
    expect(
      cancelInvoiceResponseSchema.parse({
        createdDate: "2026-08-16T12:00:00Z",
        modifiedDate: "2026-08-16T12:01:00Z",
        status: "processing",
      }),
    ).toEqual({
      createdDate: "2026-08-16T12:00:00Z",
      modifiedDate: "2026-08-16T12:01:00Z",
      status: "processing",
    });
    expect(finalizeInvoiceResponseSchema.parse({ status: "success" })).toEqual({
      status: "success",
    });
  });

  it("parses fiscal checks with their documented enum values", () => {
    const fixture = {
      checks: [
        {
          file: "base64-pdf",
          fiscalizationSource: FiscalizationSource.Monopay,
          id: "check-42",
          status: FiscalCheckStatus.Done,
          statusDescription: "Fiscalized",
          taxUrl: "https://cabinet.tax.gov.ua/cashregs/check",
          type: FiscalCheckType.Sale,
        },
      ],
    } as const;

    expect(invoiceFiscalChecksSchema.parse(fixture)).toEqual(fixture);
  });

  it("rejects malformed response fields", () => {
    expect(
      newInvoiceSchema.safeParse({ invoiceId: "invoice-42" }).success,
    ).toBe(false);
    expect(
      invoiceStatusSchema.safeParse({
        ...invoiceStatusFixture,
        createdDate: "yesterday",
      }).success,
    ).toBe(false);
    expect(
      cancelInvoiceResponseSchema.safeParse({
        createdDate: "invalid",
        modifiedDate: "2026-08-16T12:01:00Z",
        status: "processing",
      }).success,
    ).toBe(false);
    expect(
      finalizeInvoiceResponseSchema.safeParse({ status: "processing" }).success,
    ).toBe(false);
    expect(invoiceFiscalChecksSchema.safeParse({ checks: [{}] }).success).toBe(
      false,
    );
  });
});
