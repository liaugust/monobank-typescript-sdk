import * as z from "zod/mini";

import type { FiscalizationItem } from "./fiscalization-item.js";
import { fiscalizationItemShape } from "./fiscalization-item.js";
import type { InvoiceDiscount } from "./invoice-discount.js";
import { invoiceDiscountSchema } from "./invoice-discount.js";

/** Runtime validator for an item displayed on an invoice. */
const invoiceBasketItemSchema = z.object({
  ...fiscalizationItemShape,
  discounts: z.optional(z.array(invoiceDiscountSchema)),
  icon: z.optional(z.string()),
  total: z.optional(z.int()),
  unit: z.optional(z.string()),
});

/** Runtime validator for merchant-defined invoice order details. */
export const merchantPaymentInfoSchema = z.object({
  basketOrder: z.optional(z.array(invoiceBasketItemSchema)),
  comment: z.optional(z.string().check(z.maxLength(280))),
  customerEmails: z.optional(
    z
      .array(z.string())
      .check(
        z.refine(
          (emails) => new Set(emails).size === emails.length,
          "customerEmails must contain unique values",
        ),
      ),
  ),
  destination: z.optional(z.string().check(z.maxLength(280))),
  discounts: z.optional(z.array(invoiceDiscountSchema)),
  reference: z.optional(z.string()),
});

/** Basket item displayed on an invoice and optionally sent for fiscalization. */
export interface InvoiceBasketItem extends FiscalizationItem {
  /** Optional adjustments applied to this basket item. */
  readonly discounts?: readonly InvoiceDiscount[];
  /** Optional product image URL. */
  readonly icon?: string;
  /** Optional total amount for all item units in minor units. */
  readonly total?: number;
  /** Optional unit-of-measure label. */
  readonly unit?: string;
}

/** Merchant-defined order details attached to a new invoice. */
export interface MerchantPaymentInfo {
  /** Optional itemized order contents. */
  readonly basketOrder?: readonly InvoiceBasketItem[];
  /** Optional internal comment, limited to 280 characters. */
  readonly comment?: string;
  /** Optional recipients for a fiscal receipt. */
  readonly customerEmails?: readonly string[];
  /** Optional payment purpose, limited to 280 characters. */
  readonly destination?: string;
  /** Optional order-wide adjustments. */
  readonly discounts?: readonly InvoiceDiscount[];
  /** Optional merchant order or receipt reference. */
  readonly reference?: string;
}
