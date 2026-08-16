import * as z from "zod/mini";

/** Runtime shape shared by fiscalization and invoice basket items. */
export const fiscalizationItemShape = {
  barcode: z.optional(z.string()),
  code: z.string().check(z.minLength(1)),
  footer: z.optional(z.string()),
  header: z.optional(z.string()),
  name: z.string().check(z.minLength(1)),
  qty: z.number(),
  sum: z.int(),
  tax: z.optional(z.array(z.int())),
  uktzed: z.optional(z.string()),
};

/** Runtime validator for an item used in invoice fiscalization. */
export const fiscalizationItemSchema = z.object(fiscalizationItemShape);

/** Item data used to fiscalize an invoice cancellation or hold finalization. */
export interface FiscalizationItem {
  /** Optional product barcode. */
  readonly barcode?: string;
  /** Merchant product code required by Monobank. */
  readonly code: string;
  /** Optional text printed after the item name. */
  readonly footer?: string;
  /** Optional text printed before the item name. */
  readonly header?: string;
  /** Product or service name. */
  readonly name: string;
  /** Item quantity. */
  readonly qty: number;
  /** Per-item amount in the currency's minor units. */
  readonly sum: number;
  /** Optional fiscal tax-rate identifiers. */
  readonly tax?: readonly number[];
  /** Optional Ukrainian product-classification code. */
  readonly uktzed?: string;
}
