import { describe, expect, it } from "vitest";

import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import {
  InvoicePaymentMethod,
  InvoicePaymentSystem,
} from "../models/invoice-payment-info.js";
import { InvoiceWalletStatus } from "../models/invoice-wallet.js";
import {
  createInvoiceStatusEndpoint,
  InvoiceStatus,
  invoiceStatusSchema,
} from "./get-invoice-status.js";

const completeInvoice = {
  amount: 4_200,
  cancelList: [
    {
      createdDate: "2026-08-16T12:00:00Z",
      modifiedDate: "2026-08-16T12:01:00Z",
      status: "success",
    },
  ],
  ccy: 980,
  createdDate: "2026-08-16T11:00:00Z",
  invoiceId: "invoice-42",
  paymentInfo: {
    maskedPan: "444403******1902",
    paymentMethod: InvoicePaymentMethod.Apple,
    paymentSystem: InvoicePaymentSystem.Visa,
    terminal: "MI001088",
  },
  status: InvoiceStatus.Success,
  tipsInfo: { amount: 420, employeeId: "employee-7" },
  walletData: {
    cardToken: "card-token",
    status: InvoiceWalletStatus.Created,
    walletId: "customer-42",
  },
} as const;

describe("get invoice status contract", () => {
  it("encodes invoice identifiers", () => {
    expect(createInvoiceStatusEndpoint({ invoiceId: "invoice/42 ?" })).toBe(
      "/api/merchant/invoice/status?invoiceId=invoice%2F42+%3F",
    );
    expect(() => createInvoiceStatusEndpoint({ invoiceId: "" })).toThrow(
      MonobankValidationError,
    );
  });

  it("parses complete and minimal invoice responses", () => {
    expect(invoiceStatusSchema.parse(completeInvoice)).toEqual(completeInvoice);
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
  });

  it("rejects malformed status values and timestamps", () => {
    expect(
      invoiceStatusSchema.safeParse({ ...completeInvoice, status: "unknown" })
        .success,
    ).toBe(false);
    expect(
      invoiceStatusSchema.safeParse({
        ...completeInvoice,
        createdDate: "yesterday",
      }).success,
    ).toBe(false);
  });
});
