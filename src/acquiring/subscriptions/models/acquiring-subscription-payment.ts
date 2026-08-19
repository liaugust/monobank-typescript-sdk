import * as z from "zod/mini";

import type { AcquiringSubscriptionPagination } from "./acquiring-subscription-pagination.js";
import { acquiringSubscriptionPaginationSchema } from "./acquiring-subscription-pagination.js";

/**
 * Runtime validator for one charge taken against a subscription.
 *
 * `amount` is in the currency's minor units. `status` is a string rather than
 * an enum because Monobank documents no closed set of charge outcomes.
 */
export const acquiringSubscriptionPaymentSchema = z.looseObject({
  amount: z.int(),
  ccy: z.optional(z.int()),
  chargedAt: z.optional(z.string()),
  status: z.string(),
});

/** One validated charge taken against a subscription. */
export type AcquiringSubscriptionPayment = z.infer<
  typeof acquiringSubscriptionPaymentSchema
>;

/** Runtime validator for `GET /api/merchant/subscription/payments` responses. */
export const acquiringSubscriptionPaymentListSchema = z.looseObject({
  pagination: z.optional(acquiringSubscriptionPaginationSchema),
  payments: z.array(acquiringSubscriptionPaymentSchema),
});

/** Validated page of charges taken against one subscription. */
export interface AcquiringSubscriptionPaymentList {
  /** Paging counters, absent when Monobank omits them. */
  readonly pagination?: AcquiringSubscriptionPagination | undefined;
  /** Charges falling inside the requested window. */
  readonly payments: readonly AcquiringSubscriptionPayment[];
  /** Additive response fields preserved by the loose runtime schema. */
  readonly [key: string]: unknown;
}
