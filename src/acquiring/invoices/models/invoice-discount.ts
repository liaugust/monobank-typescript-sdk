import * as z from "zod/mini";

/** Importable values accepted by order discount `type` fields. */
export const DiscountType = {
  Discount: "DISCOUNT",
  ExtraCharge: "EXTRA_CHARGE",
} as const;

/** A documented order discount or surcharge type. */
export type DiscountType = (typeof DiscountType)[keyof typeof DiscountType];

/** Importable values accepted by order discount `mode` fields. */
export const DiscountMode = {
  Percent: "PERCENT",
  Value: "VALUE",
} as const;

/** A documented order discount calculation mode. */
export type DiscountMode = (typeof DiscountMode)[keyof typeof DiscountMode];

/** A discount or surcharge applied to an invoice or basket item. */
export interface InvoiceDiscount {
  /** Whether the adjustment is percentage-based or an absolute value. */
  readonly mode: DiscountMode;
  /** Whether the adjustment is a discount or surcharge. */
  readonly type: DiscountType;
  /** Adjustment value, with at most two decimal places and a minimum of 0.01. */
  readonly value: number;
}

/** Runtime validator for invoice and basket discounts. */
export const invoiceDiscountSchema = z.object({
  mode: z.enum(DiscountMode),
  type: z.enum(DiscountType),
  value: z.number().check(z.minimum(0.01), z.multipleOf(0.01)),
});
