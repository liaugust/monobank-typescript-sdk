import * as z from "zod/mini";

/** Documented POS refund lifecycle states. */
export const AcquiringPosCancellationStatus = {
  New: "new",
  Processing: "processing",
  Success: "success",
  Rejected: "rejected",
  Reversed: "reversed",
} as const;
/** A documented POS refund lifecycle state. */
export type AcquiringPosCancellationStatus =
  (typeof AcquiringPosCancellationStatus)[keyof typeof AcquiringPosCancellationStatus];

/** Runtime validator for POS refund status; every documented field is optional. */
export const acquiringPosCancellationStatusSchema = z.looseObject({
  amount: z.optional(z.int()),
  cancelRef: z.optional(z.string()),
  createTime: z.optional(z.iso.datetime({ offset: true })),
  modifyTime: z.optional(z.iso.datetime({ offset: true })),
  originalTranId: z.optional(z.string()),
  rrn: z.optional(z.string()),
  status: z.optional(z.enum(AcquiringPosCancellationStatus)),
});
/** Validated POS refund details; amount is in minor units and dates are RFC-3339. */
export type AcquiringPosCancellationDetails = z.infer<
  typeof acquiringPosCancellationStatusSchema
>;
