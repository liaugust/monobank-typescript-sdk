import * as z from "zod/mini";

import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import { invalidInstallmentsRequestMessage } from "../../shared/request-validation.js";

/** Input identifying one Покупка Частинами order. */
export interface InstallmentsOrderIdentifierInput {
  /** Order identifier Monobank returned from `orders.create()`, a UUID. */
  readonly order_id: string;
}

const orderIdentifierPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

const orderIdentifierSchema = z.object({
  order_id: z
    .string()
    .check(z.refine((value) => orderIdentifierPattern.test(value))),
});

/**
 * Parses a Покупка Частинами order identifier ahead of Fetch.
 *
 * Monobank documents the identifier as a UUID, so a malformed one fails here
 * rather than as an upstream 404 that reads like an unknown order. The thrown
 * error carries only the endpoint and a fixed issue string, so a rejected
 * identifier is never retained in public error state.
 * @param input Untrusted method input.
 * @param endpoint Endpoint receiving the validated identifier.
 * @returns Validated order identifier.
 * @throws {MonobankValidationError} When `order_id` is not a UUID.
 */
export function parseInstallmentsOrderIdentifier(
  input: InstallmentsOrderIdentifierInput,
  endpoint: string,
): InstallmentsOrderIdentifierInput {
  const parsed = orderIdentifierSchema.safeParse(input);

  if (!parsed.success) {
    throw new MonobankValidationError({
      endpoint,
      issues: ["order_id must be a UUID"],
      message: invalidInstallmentsRequestMessage,
    });
  }

  return parsed.data;
}
