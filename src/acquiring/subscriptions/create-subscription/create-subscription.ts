import * as z from "zod/mini";

import { parseMonobankRequest } from "../../../shared/request-validation.js";

/** Root-relative endpoint used to create an Acquiring subscription. */
export const createAcquiringSubscriptionEndpoint =
  "/api/merchant/subscription/create";

const subscriptionIntervalPattern = /^[1-9][0-9]*[dwmy]$/u;

const createAcquiringSubscriptionSchema = z.object({
  amount: z.int(),
  ccy: z.optional(z.int()),
  interval: z
    .string()
    .check(z.refine((value) => subscriptionIntervalPattern.test(value))),
  redirectUrl: z.optional(z.string()),
  validity: z.optional(z.int()),
  webHookUrls: z.optional(
    z.object({
      chargeUrl: z.optional(z.string()),
      statusUrl: z.optional(z.string()),
    }),
  ),
});

type CreateAcquiringSubscriptionBody = z.output<
  typeof createAcquiringSubscriptionSchema
>;

/** Input for creating an Acquiring subscription. */
export interface CreateAcquiringSubscriptionInput {
  /** Recurring charge amount in the currency's minor units. */
  readonly amount: number;
  /** Optional numeric ISO 4217 currency code; Monobank defaults to 980. */
  readonly ccy?: number;
  /**
   * Charge cadence as a count followed by a unit: `d`, `w`, `m`, or `y`.
   *
   * `"1d"` charges daily, `"2w"` every second week, `"1m"` monthly, `"1y"`
   * yearly. Rejected before Fetch when it does not match that form.
   */
  readonly interval: string;
  /** Optional URL Monobank redirects the payer to after the first payment. */
  readonly redirectUrl?: string;
  /**
   * Optional lifetime of the first payment page in seconds.
   *
   * Monobank defaults to 24 hours and silently truncates anything above 30
   * days, so a longer value is not an error but is not honored either.
   */
  readonly validity?: number;
  /** Optional callback URLs for charge and subscription-status changes. */
  readonly webHookUrls?: {
    /** Optional callback URL invoked for each recurring charge. */
    readonly chargeUrl?: string;
    /** Optional callback URL invoked when the subscription's state changes. */
    readonly statusUrl?: string;
  };
}

/** Runtime validator for `POST /api/merchant/subscription/create` responses. */
export const newAcquiringSubscriptionSchema = z.looseObject({
  pageUrl: z.string(),
  subscriptionId: z.string(),
});

/** Newly created subscription identifier and its first payment-page URL. */
export type NewAcquiringSubscription = z.infer<
  typeof newAcquiringSubscriptionSchema
>;

/**
 * Validates and builds a create-subscription JSON body.
 * @param input Subscription creation parameters.
 * @returns Validated JSON-serializable request body.
 * @throws {MonobankValidationError} When a documented field has an invalid shape or `interval` is malformed.
 */
export function createAcquiringSubscriptionBody(
  input: CreateAcquiringSubscriptionInput,
): CreateAcquiringSubscriptionBody {
  return parseMonobankRequest(
    createAcquiringSubscriptionSchema,
    input,
    createAcquiringSubscriptionEndpoint,
    "Invalid Acquiring subscription request.",
  );
}
