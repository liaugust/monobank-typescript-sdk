import type { AcquiringSubscriptionIdentifierInput } from "../shared/subscription-identifier.js";
import { parseAcquiringSubscriptionIdentifier } from "../shared/subscription-identifier.js";

const acquiringSubscriptionStatusEndpoint = "/api/merchant/subscription/status";

/** Input identifying the subscription whose state should be loaded. */
export type GetAcquiringSubscriptionStatusInput =
  AcquiringSubscriptionIdentifierInput;

/**
 * Builds the encoded Acquiring subscription status endpoint.
 * @param input Subscription identifier.
 * @returns Root-relative status endpoint with an encoded `subscriptionId` query parameter.
 * @throws {MonobankValidationError} When `subscriptionId` is not a nonempty string without surrounding whitespace.
 */
export function createAcquiringSubscriptionStatusEndpoint(
  input: GetAcquiringSubscriptionStatusInput,
): string {
  const parsed = parseAcquiringSubscriptionIdentifier(
    input,
    acquiringSubscriptionStatusEndpoint,
  );
  const search = new URLSearchParams({ subscriptionId: parsed.subscriptionId });

  return `${acquiringSubscriptionStatusEndpoint}?${search.toString()}`;
}
