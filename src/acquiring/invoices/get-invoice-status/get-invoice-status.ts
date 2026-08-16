import * as z from "zod/mini";

import { cancelInvoiceResponseSchema } from "../models/invoice-cancellation.js";
import { invoicePaymentInfoSchema } from "../models/invoice-payment-info.js";
import { invoiceWalletSchema } from "../models/invoice-wallet.js";
import type { GetInvoiceStatusInput } from "../shared/invoice-identifier.js";
import { createInvoiceQueryEndpoint } from "../shared/invoice-identifier.js";

/** Root-relative endpoint used to load invoice status. */
const getInvoiceStatusEndpoint = "/api/merchant/invoice/status";

/** Importable values returned by an invoice `status` field. */
export const InvoiceStatus = {
  Created: "created",
  Expired: "expired",
  Failure: "failure",
  Hold: "hold",
  Processing: "processing",
  Reversed: "reversed",
  Success: "success",
} as const;

/** A documented Acquiring invoice status. */
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

const invoiceTipsInfoSchema = z.looseObject({
  amount: z.optional(z.int()),
  employeeId: z.string(),
});

/** Runtime validator for `GET /api/merchant/invoice/status` responses. */
export const invoiceStatusSchema = z.looseObject({
  amount: z.int(),
  cancelList: z.optional(z.array(cancelInvoiceResponseSchema)),
  ccy: z.int(),
  createdDate: z.optional(z.iso.datetime({ offset: true })),
  destination: z.optional(z.string()),
  errCode: z.optional(z.string()),
  failureReason: z.optional(z.string()),
  finalAmount: z.optional(z.int()),
  invoiceId: z.string(),
  modifiedDate: z.optional(z.iso.datetime({ offset: true })),
  paymentInfo: z.optional(invoicePaymentInfoSchema),
  reference: z.optional(z.string()),
  status: z.enum(InvoiceStatus),
  tipsInfo: z.optional(invoiceTipsInfoSchema),
  walletData: z.optional(invoiceWalletSchema),
});

/** Validated lifecycle, amount, payment, wallet, and cancellation data for an invoice. */
export type Invoice = z.infer<typeof invoiceStatusSchema>;

/**
 * Builds the encoded invoice-status endpoint.
 * @param input Invoice identifier.
 * @returns Root-relative endpoint with an encoded query string.
 * @throws {MonobankValidationError} When `invoiceId` is empty.
 */
export function createInvoiceStatusEndpoint(
  input: GetInvoiceStatusInput,
): string {
  return createInvoiceQueryEndpoint(getInvoiceStatusEndpoint, input);
}

export type { GetInvoiceStatusInput } from "../shared/invoice-identifier.js";
