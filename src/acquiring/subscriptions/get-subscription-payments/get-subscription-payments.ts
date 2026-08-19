import type { AcquiringSubscriptionIdentifierInput } from "../shared/subscription-identifier.js";
import { parseAcquiringSubscriptionIdentifier } from "../shared/subscription-identifier.js";
import type { AcquiringSubscriptionPageInput } from "../shared/subscription-page-query.js";
import { createAcquiringSubscriptionPageQuery } from "../shared/subscription-page-query.js";

const acquiringSubscriptionPaymentsEndpoint =
  "/api/merchant/subscription/payments";

/** Input for reading the charge history of one subscription. */
export interface GetAcquiringSubscriptionPaymentsInput
  extends
    AcquiringSubscriptionPageInput,
    AcquiringSubscriptionIdentifierInput {}

/**
 * Builds the encoded Acquiring subscription payment-history endpoint.
 * @param input Subscription identifier, window, and paging values.
 * @returns Root-relative payment-history endpoint with encoded query parameters.
 * @throws {MonobankValidationError} When the identifier, window, or paging values are invalid.
 */
export function createAcquiringSubscriptionPaymentsEndpoint(
  input: GetAcquiringSubscriptionPaymentsInput,
): string {
  const parsed = parseAcquiringSubscriptionIdentifier(
    input,
    acquiringSubscriptionPaymentsEndpoint,
  );
  const search = createAcquiringSubscriptionPageQuery(
    input,
    acquiringSubscriptionPaymentsEndpoint,
  );

  search.set("subscriptionId", parsed.subscriptionId);

  return `${acquiringSubscriptionPaymentsEndpoint}?${search.toString()}`;
}
