import * as z from "zod/mini";

/** Importable values accepted by the Acquiring subscription list filter. */
export const AcquiringSubscriptionStatus = {
  Active: "active",
  Cancelled: "cancelled",
} as const;

/** A documented Acquiring subscription list filter value. */
export type AcquiringSubscriptionStatus =
  (typeof AcquiringSubscriptionStatus)[keyof typeof AcquiringSubscriptionStatus];

/**
 * Runtime validator for the lifetime charge counters on a subscription.
 *
 * Both counters are optional because Monobank documents them only through a
 * response sample.
 */
export const acquiringSubscriptionSummarySchema = z.looseObject({
  totalFailed: z.optional(z.int()),
  totalPaid: z.optional(z.int()),
});

/** Validated count of settled and failed charges for one subscription. */
export type AcquiringSubscriptionSummary = z.infer<
  typeof acquiringSubscriptionSummarySchema
>;

/**
 * Runtime validator for the tokenized card a subscription charges.
 *
 * `cardToken` is credential-grade material: it authorizes further charges, so
 * never log or persist it outside the merchant's own secured storage.
 */
export const acquiringSubscriptionWalletDataSchema = z.looseObject({
  cardToken: z.optional(z.string()),
  failureDescription: z.optional(z.string()),
  status: z.optional(z.string()),
  walletId: z.optional(z.string()),
});

/** Validated tokenized-card state attached to one subscription. */
export type AcquiringSubscriptionWalletData = z.infer<
  typeof acquiringSubscriptionWalletDataSchema
>;

/**
 * Runtime validator for `GET /api/merchant/subscription/status` responses.
 *
 * Only `subscriptionId` and `status` are required. Monobank publishes a sample
 * instead of a response schema for this endpoint, so requiring a field the
 * sample happens to show would reject a legitimate response: `endDate` and
 * `cancellationDesc` exist only once a subscription ends, and `walletData`
 * only once a card is attached. `status` is deliberately a string rather than
 * an enum, because the documentation states no closed set for it.
 */
export const acquiringSubscriptionSchema = z.looseObject({
  amount: z.optional(z.int()),
  cancellationDesc: z.optional(z.string()),
  ccy: z.optional(z.int()),
  endDate: z.optional(z.string()),
  interval: z.optional(z.string()),
  nextChargeDate: z.optional(z.string()),
  startDate: z.optional(z.string()),
  status: z.string(),
  subscriptionId: z.string(),
  summary: z.optional(acquiringSubscriptionSummarySchema),
  walletData: z.optional(acquiringSubscriptionWalletDataSchema),
});

/** Validated state of one Acquiring subscription. */
export type AcquiringSubscription = z.infer<typeof acquiringSubscriptionSchema>;
