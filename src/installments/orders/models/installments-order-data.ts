import * as z from "zod/mini";

/**
 * Runtime validator for one refund recorded against an order.
 *
 * `sum` is hryvnia rather than minor units, and `timestamp` is explicitly `null`
 * until the refund is processed.
 */
export const installmentsOrderReverseSchema = z.looseObject({
  sum: z.optional(z.number()),
  timestamp: z.optional(z.nullable(z.string())),
});

/** One validated refund recorded against a Покупка Частинами order. */
export type InstallmentsOrderReverse = z.infer<
  typeof installmentsOrderReverseSchema
>;

/**
 * Runtime validator for the settlement details of one order.
 *
 * Shared by `orders.getData()` and `orders.getInfo()`, which Monobank documents
 * with identical responses. Every field is optional because the documentation is
 * a sample rather than a schema, and `create_timestamp` is explicitly `null`
 * before the order is created.
 *
 * `total_sum` is hryvnia rather than minor units. `maskedCard` is camelCase amid
 * otherwise snake_case fields, which is how Monobank spells it and is preserved
 * rather than corrected. It and `iban` describe where the money moves, so treat
 * both as payment data rather than as a display string.
 */
export const installmentsOrderDataSchema = z.looseObject({
  create_timestamp: z.optional(z.nullable(z.string())),
  iban: z.optional(z.string()),
  invoice_date: z.optional(z.string()),
  invoice_number: z.optional(z.string()),
  maskedCard: z.optional(z.string()),
  point_id: z.optional(z.string()),
  reverse_list: z.optional(z.array(installmentsOrderReverseSchema)),
  source: z.optional(z.string()),
  store_order_id: z.optional(z.string()),
  total_sum: z.optional(z.number()),
});

/** Validated settlement details of one Покупка Частинами order. */
export type InstallmentsOrderData = z.infer<typeof installmentsOrderDataSchema>;
