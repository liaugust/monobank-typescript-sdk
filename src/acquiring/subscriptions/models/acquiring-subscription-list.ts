import * as z from "zod/mini";

import type { AcquiringSubscriptionPagination } from "./acquiring-subscription-pagination.js";
import { acquiringSubscriptionPaginationSchema } from "./acquiring-subscription-pagination.js";

/**
 * Runtime validator for one entry of the subscription list.
 *
 * Only `subscriptionId` is required. Monobank documents this response through a
 * sample rather than a schema, so the remaining fields stay optional to keep an
 * entry that omits one from failing the whole page.
 */
export const acquiringSubscriptionListItemSchema = z.looseObject({
  amount: z.optional(z.int()),
  created: z.optional(z.string()),
  endDate: z.optional(z.string()),
  interval: z.optional(z.string()),
  nextChargeDate: z.optional(z.string()),
  startDate: z.optional(z.string()),
  status: z.optional(z.string()),
  subscriptionId: z.string(),
});

/** One validated subscription summary from a list page. */
export type AcquiringSubscriptionListItem = z.infer<
  typeof acquiringSubscriptionListItemSchema
>;

/** Runtime validator for `GET /api/merchant/subscription/list` responses. */
export const acquiringSubscriptionListSchema = z.looseObject({
  list: z.array(acquiringSubscriptionListItemSchema),
  pagination: z.optional(acquiringSubscriptionPaginationSchema),
});

/** Validated page of a merchant's subscriptions. */
export interface AcquiringSubscriptionList {
  /** Subscriptions matching the requested window and filter. */
  readonly list: readonly AcquiringSubscriptionListItem[];
  /** Paging counters, absent when Monobank omits them. */
  readonly pagination?: AcquiringSubscriptionPagination | undefined;
  /** Additive response fields preserved by the loose runtime schema. */
  readonly [key: string]: unknown;
}
