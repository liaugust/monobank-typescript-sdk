import type { AcquiringSubscriptionIdentifierInput } from "../shared/subscription-identifier.js";
import { parseAcquiringSubscriptionIdentifier } from "../shared/subscription-identifier.js";

/** Root-relative endpoint used to deactivate an Acquiring subscription. */
export const removeAcquiringSubscriptionEndpoint =
  "/api/merchant/subscription/remove";

/** Input identifying the subscription to deactivate. */
export type RemoveAcquiringSubscriptionInput =
  AcquiringSubscriptionIdentifierInput;

/**
 * Validates and builds a remove-subscription JSON body.
 * @param input Subscription identifier.
 * @returns Validated JSON-serializable request body.
 * @throws {MonobankValidationError} When `subscriptionId` is not a nonempty string without surrounding whitespace.
 */
export function createRemoveAcquiringSubscriptionBody(
  input: RemoveAcquiringSubscriptionInput,
): RemoveAcquiringSubscriptionInput {
  return parseAcquiringSubscriptionIdentifier(
    input,
    removeAcquiringSubscriptionEndpoint,
  );
}
