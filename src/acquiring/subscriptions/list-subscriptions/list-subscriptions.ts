import * as z from "zod/mini";

import { parseMonobankRequest } from "../../../shared/request-validation.js";
import type { AcquiringSubscriptionStatus } from "../models/acquiring-subscription.js";
import { AcquiringSubscriptionStatus as AcquiringSubscriptionStatusValues } from "../models/acquiring-subscription.js";
import type { AcquiringSubscriptionPageInput } from "../shared/subscription-page-query.js";
import { createAcquiringSubscriptionPageQuery } from "../shared/subscription-page-query.js";

const listAcquiringSubscriptionsEndpoint = "/api/merchant/subscription/list";

const listAcquiringSubscriptionsFilterSchema = z.object({
  status: z.optional(z.enum(AcquiringSubscriptionStatusValues)),
});

/** Input for listing a merchant's subscriptions over a window. */
export interface ListAcquiringSubscriptionsInput extends AcquiringSubscriptionPageInput {
  /** Optional lifecycle filter; Monobank returns every subscription when omitted. */
  readonly status?: AcquiringSubscriptionStatus;
}

/**
 * Builds the encoded Acquiring subscription list endpoint.
 * @param input Window, paging, and optional lifecycle filter.
 * @returns Root-relative list endpoint with encoded query parameters.
 * @throws {MonobankValidationError} When the window, paging values, or `status` filter is invalid.
 */
export function createListAcquiringSubscriptionsEndpoint(
  input: ListAcquiringSubscriptionsInput,
): string {
  const { status } = parseMonobankRequest(
    listAcquiringSubscriptionsFilterSchema,
    { ...(input.status === undefined ? {} : { status: input.status }) },
    listAcquiringSubscriptionsEndpoint,
    "Invalid Acquiring subscription request.",
  );
  const search = createAcquiringSubscriptionPageQuery(
    input,
    listAcquiringSubscriptionsEndpoint,
  );

  if (status !== undefined) {
    search.set("status", status);
  }

  return `${listAcquiringSubscriptionsEndpoint}?${search.toString()}`;
}
