import * as z from "zod/mini";

/**
 * Runtime validator for the state of one Покупка Частинами order.
 *
 * Shared by `orders.getState()`, `orders.confirm()`, and `orders.reject()`, which
 * Monobank documents with the same response. Only `order_id` is required: the
 * responses are documented with samples rather than schemas, and `message` is
 * explicitly `null` on success rather than absent.
 *
 * `state` and `order_sub_state` are strings, not enums, because the documented
 * status table is prose. The one that matters operationally is
 * `WAITING_FOR_STORE_CONFIRM`: it means the client approved the credit and the
 * goods can be released, after which `orders.confirm()` activates the plan.
 */
export const installmentsOrderStateSchema = z.looseObject({
  message: z.optional(z.nullable(z.string())),
  order_id: z.string(),
  order_sub_state: z.optional(z.string()),
  state: z.optional(z.string()),
});

/** Validated state of one Покупка Частинами order. */
export type InstallmentsOrderState = z.infer<
  typeof installmentsOrderStateSchema
>;
