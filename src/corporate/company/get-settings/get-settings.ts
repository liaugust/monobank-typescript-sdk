import * as z from "zod/mini";

import { parseMonobankRequest } from "../../../shared/request-validation.js";

/** Input identifying one signed corporate settings request. */
export interface GetCorporateSettingsInput {
  /** Value sent as `X-Request-Id` for this call. */
  readonly requestId: string;
}

/** Root-relative endpoint for the authenticated company settings read. */
export const corporateSettingsEndpoint = "/personal/corp/settings";

const getCorporateSettingsSchema = z.object({
  requestId: z.string().check(z.refine((value) => /^[!-~]+$/u.test(value))),
});

/**
 * Runtime validator for the signed `/personal/corp/settings` response.
 *
 * `id` is listed as required upstream but never defined, so its type is unknown
 * and it stays unmodeled rather than guessed; the loose object preserves it at
 * runtime. `webhook` is absent from that `required` array, so it is optional.
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
 * @throws {MonobankValidationError} When `requestId` is empty or not printable ASCII without spaces.
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
