import * as z from "zod/mini";

import { parseMonobankRequest } from "../../../shared/request-validation.js";

/** Input identifying one signed corporate settings request. */
export interface GetCorporateSettingsInput {
  /** Value sent as `X-Request-Id` for this call. */
  readonly requestId: string;
}

export const corporateSettingsEndpoint = "/personal/corp/settings";

const getCorporateSettingsSchema = z.object({
  requestId: z
    .string()
    .check(z.refine((value) => value.length > 0 && value.trim() === value)),
});

/**
 * Runtime validator for the signed `/personal/corp/settings` response.
 *
 * Monobank lists `id` in the response's `required` array but never defines the
 * property or gives an example, so its type is unknown and it is left unmodeled
 * rather than guessed; the loose object still preserves it at runtime. `webhook`
 * is absent from that `required` array and is modeled optional.
 */
export const corporateSettingsSchema = z.looseObject({
  logo: z.string(),
  name: z.string(),
  permission: z.string(),
  pubkey: z.string(),
  webhook: z.optional(z.string()),
});

/** Company registration data associated with the configured Corporate key. */
export type CorporateSettings = z.infer<typeof corporateSettingsSchema>;

/**
 * Validates the corporate settings request ahead of Fetch.
 * @param input Request identifier for this call.
 * @returns Parsed request data.
 * @throws {MonobankValidationError} When `requestId` is empty or has surrounding whitespace.
 */
export function parseGetCorporateSettingsInput(
  input: GetCorporateSettingsInput,
): GetCorporateSettingsInput {
  return parseMonobankRequest(
    getCorporateSettingsSchema,
    input,
    corporateSettingsEndpoint,
    "Invalid corporate settings request.",
  );
}
