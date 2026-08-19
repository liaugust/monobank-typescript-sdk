import * as z from "zod/mini";

import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";

/** Input identifying one Acquiring subscription. */
export interface AcquiringSubscriptionIdentifierInput {
  /** Subscription identifier returned by `acquiring.subscriptions.create()`. */
  readonly subscriptionId: string;
}

const subscriptionIdentifierSchema = z.object({
  subscriptionId: z
    .string()
    .check(z.refine((value) => value.length > 0 && value.trim() === value)),
});

/**
 * Parses an Acquiring subscription identifier ahead of Fetch.
 *
 * The thrown error carries only the endpoint and a fixed issue string, so a
 * rejected identifier is never retained in public error state.
 * @param input Untrusted method input.
 * @param endpoint Endpoint receiving the validated identifier.
 * @returns Validated subscription identifier.
 * @throws {MonobankValidationError} When `subscriptionId` is not a nonempty string without surrounding whitespace.
 */
export function parseAcquiringSubscriptionIdentifier(
  input: AcquiringSubscriptionIdentifierInput,
  endpoint: string,
): AcquiringSubscriptionIdentifierInput {
  const parsed = subscriptionIdentifierSchema.safeParse(input);

  if (!parsed.success) {
    throw new MonobankValidationError({
      endpoint,
      issues: [
        "subscriptionId must be a nonempty string without surrounding whitespace",
      ],
      message: "Invalid Acquiring subscription request.",
    });
  }

  return parsed.data;
}
