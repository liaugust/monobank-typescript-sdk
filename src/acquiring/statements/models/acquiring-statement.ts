import * as z from "zod/mini";

/** Importable values returned by Acquiring statement `paymentScheme` fields. */
export const AcquiringPaymentScheme = {
  BnplLater30: "bnpl_later_30",
  BnplParts4: "bnpl_parts_4",
  Full: "full",
} as const;

/** A documented Acquiring statement payment scheme. */
export type AcquiringPaymentScheme =
  (typeof AcquiringPaymentScheme)[keyof typeof AcquiringPaymentScheme];

/** Importable values returned by Acquiring statement `status` fields. */
export const AcquiringStatementStatus = {
  Failure: "failure",
  Hold: "hold",
  Processing: "processing",
  Success: "success",
} as const;

/** A documented Acquiring statement transaction status. */
export type AcquiringStatementStatus =
  (typeof AcquiringStatementStatus)[keyof typeof AcquiringStatementStatus];

/** Runtime validator for one cancellation nested in an Acquiring statement item. */
export const acquiringStatementCancellationSchema = z.looseObject({
  amount: z.int(),
  approvalCode: z.optional(z.string()),
  ccy: z.int(),
  date: z.iso.datetime({ offset: true }),
  maskedPan: z.string(),
  rrn: z.optional(z.string()),
});

/** A cancellation nested in an Acquiring statement transaction. */
export type AcquiringStatementCancellation = z.infer<
  typeof acquiringStatementCancellationSchema
>;

/** Runtime validator for one Acquiring statement transaction. */
export const acquiringStatementItemSchema = z.looseObject({
  amount: z.int(),
  approvalCode: z.optional(z.string()),
  cancelList: z.optional(z.array(acquiringStatementCancellationSchema)),
  ccy: z.int(),
  date: z.iso.datetime({ offset: true }),
  destination: z.optional(z.string()),
  invoiceId: z.string(),
  maskedPan: z.string(),
  paymentScheme: z.enum(AcquiringPaymentScheme),
  profitAmount: z.optional(z.int()),
  reference: z.optional(z.string()),
  rrn: z.optional(z.string()),
  shortQrId: z.optional(z.nullable(z.string())),
  status: z.enum(AcquiringStatementStatus),
});

/** One validated Acquiring transaction returned in a statement. */
export type AcquiringStatementItem = z.infer<
  typeof acquiringStatementItemSchema
>;

/** Runtime validator for `GET /api/merchant/statement` responses. */
export const acquiringStatementSchema = z.looseObject({
  list: z.array(acquiringStatementItemSchema),
});

/** Validated Acquiring statement response ordered from newest to oldest. */
export interface AcquiringStatement {
  /** Acquiring transactions ordered from newest to oldest. */
  readonly list: readonly AcquiringStatementItem[];
  /** Additive response fields preserved by the loose runtime schema. */
  readonly [key: string]: unknown;
}
