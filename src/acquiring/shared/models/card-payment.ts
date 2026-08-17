import * as z from "zod/mini";

/** Importable values returned by Acquiring card-payment `status` fields. */
export const AcquiringCardPaymentStatus = {
  Failure: "failure",
  Processing: "processing",
  Success: "success",
} as const;

/** A documented Acquiring card-payment status. */
export type AcquiringCardPaymentStatus =
  (typeof AcquiringCardPaymentStatus)[keyof typeof AcquiringCardPaymentStatus];

/** Runtime validator for wallet and direct card-payment responses. */
export const acquiringCardPaymentSchema = z.looseObject({
  amount: z.int(),
  ccy: z.int(),
  createdDate: z.iso.datetime({ offset: true }),
  failureReason: z.optional(z.string()),
  invoiceId: z.string(),
  modifiedDate: z.iso.datetime({ offset: true }),
  status: z.enum(AcquiringCardPaymentStatus),
  tdsUrl: z.optional(z.string()),
});

/** Validated result of a wallet or direct card payment. */
export type AcquiringCardPayment = z.infer<typeof acquiringCardPaymentSchema>;
