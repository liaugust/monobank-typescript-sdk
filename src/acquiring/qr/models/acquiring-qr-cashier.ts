import * as z from "zod/mini";

/** Importable values returned by Acquiring QR cashier `amountType` fields. */
export const AcquiringQrAmountType = {
  Client: "client",
  Fix: "fix",
  Merchant: "merchant",
} as const;

/** A documented Acquiring QR cashier amount type. */
export type AcquiringQrAmountType =
  (typeof AcquiringQrAmountType)[keyof typeof AcquiringQrAmountType];

/** Runtime validator for one Acquiring QR cashier. */
export const acquiringQrCashierSchema = z.looseObject({
  amountType: z.enum(AcquiringQrAmountType),
  pageUrl: z.string(),
  qrId: z.string(),
  shortQrId: z.string(),
});

/** One validated Acquiring QR cashier. */
export type AcquiringQrCashier = z.infer<typeof acquiringQrCashierSchema>;

/** Runtime validator for `GET /api/merchant/qr/list` responses. */
export const acquiringQrCashierListSchema = z.looseObject({
  list: z.array(acquiringQrCashierSchema),
});

/** Validated Acquiring QR cashier-list response. */
export interface AcquiringQrCashierList {
  /** QR cashiers available to the configured merchant. */
  readonly list: readonly AcquiringQrCashier[];
  /** Additive response fields preserved by the loose runtime schema. */
  readonly [key: string]: unknown;
}
