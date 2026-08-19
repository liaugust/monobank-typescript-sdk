import * as z from "zod/mini";

import { parseMonobankRequest } from "../../../shared/request-validation.js";

/** Input identifying the application whose status is being polled. */
export interface GetCorporateRegistrationStatusInput {
  /** PEM file with the secp256k1 public key from the application, base64 encoded. */
  readonly pubkey: string;
}

/** Root-relative endpoint for polling a company authorization application. */
export const corporateRegistrationStatusEndpoint =
  "/personal/auth/registration/status";

/** Importable values returned by the Corporate registration `status` field. */
export const CorporateRegistrationStatus = {
  Approved: "Approved",
  Declined: "Declined",
  New: "New",
} as const;

/** A documented Corporate registration application status. */
export type CorporateRegistrationStatus =
  (typeof CorporateRegistrationStatus)[keyof typeof CorporateRegistrationStatus];

const getCorporateRegistrationStatusSchema = z.object({
  pubkey: z.string().check(z.refine((value) => value.trim().length > 0)),
});

/**
 * Runtime validator for the `/personal/auth/registration/status` response.
 *
 * Both fields are deliberately looser than the specification's `required`
 * array. No service key exists while an application is `New`, so requiring
 * `keyId` would reject the pending response and leave a caller unable to
 * observe status at all — and this poll is the only documented way to obtain the
 * key every other Corporate operation needs. `status` is a plain string because
 * the specification declares no `enum` for it: the three known values appear
 * only in its prose description, so an added or re-cased value would otherwise
 * discard a valid `keyId`. Compare against `CorporateRegistrationStatus`
 * instead. Revisit both if a live pending response is ever observed.
 */
export const corporateRegistrationStatusSchema = z.looseObject({
  keyId: z.optional(z.string()),
  status: z.string(),
});

/** Validated status of a Corporate authorization application. */
export type CorporateRegistrationStatusResult = z.infer<
  typeof corporateRegistrationStatusSchema
>;

/**
 * Validates the status poll ahead of Fetch.
 * @param input Public key identifying the application.
 * @returns Parsed request body.
 * @throws {MonobankValidationError} When `pubkey` is missing or blank.
 */
export function parseGetCorporateRegistrationStatusInput(
  input: GetCorporateRegistrationStatusInput,
): GetCorporateRegistrationStatusInput {
  return parseMonobankRequest(
    getCorporateRegistrationStatusSchema,
    input,
    corporateRegistrationStatusEndpoint,
    "Invalid corporate registration status request.",
  );
}
