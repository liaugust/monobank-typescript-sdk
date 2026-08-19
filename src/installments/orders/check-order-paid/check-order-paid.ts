/** Root-relative endpoint checking whether an order is fully paid. */
export const checkInstallmentsOrderPaidEndpoint = "/api/order/check/paid";

import * as z from "zod/mini";

/**
 * Runtime validator for `POST /api/order/check/paid` responses.
 *
 * Only `fully_paid` is required, because the response is documented with a
 * sample rather than a schema. `bank_can_return_money_to_card` reports whether a
 * refund can go back to the card rather than being handed over as cash, which is
 * what `orders.returnGoods()` decides with `return_money_to_card`.
 */
export const installmentsOrderPaymentSchema = z.looseObject({
  bank_can_return_money_to_card: z.optional(z.boolean()),
  fully_paid: z.boolean(),
});

/** Validated answer to whether an order is fully paid. */
export type InstallmentsOrderPayment = z.infer<
  typeof installmentsOrderPaymentSchema
>;
