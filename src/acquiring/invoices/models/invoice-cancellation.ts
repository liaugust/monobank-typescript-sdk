import * as z from "zod/mini";

/** Importable values returned by cancellation `status` fields. */
export const InvoiceCancellationStatus = {
  Failure: "failure",
  Processing: "processing",
  Success: "success",
} as const;

/** A documented Acquiring cancellation status. */
export type InvoiceCancellationStatus =
  (typeof InvoiceCancellationStatus)[keyof typeof InvoiceCancellationStatus];

/** Runtime validator shared by invoice status cancellation lists and cancellation responses. */
export const cancelInvoiceResponseSchema = z.looseObject({
  amount: z.optional(z.int()),
  approvalCode: z.optional(z.string()),
  ccy: z.optional(z.int()),
  createdDate: z.iso.datetime({ offset: true }),
  extRef: z.optional(z.string()),
  modifiedDate: z.iso.datetime({ offset: true }),
  rrn: z.optional(z.string()),
  status: z.enum(InvoiceCancellationStatus),
});

/** Accepted cancellation operation and its current status. */
export type InvoiceCancellation = z.infer<typeof cancelInvoiceResponseSchema>;
