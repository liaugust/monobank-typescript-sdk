import * as z from "zod/mini";

import { parseMonobankRequest } from "../../../shared/request-validation.js";

/** Input identifying the application whose status is being polled. */
export interface GetCorporateRegistrationStatusInput {
  /** PEM file with the secp256k1 public key from the application, base64 encoded. */
  readonly pubkey: string;
}

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
 * `keyId` is what bootstraps every later Corporate request, so both documented
 * required fields stay required here.
 */
export const corporateRegistrationStatusSchema = z.looseObject({
  keyId: z.string(),
  status: z.enum(CorporateRegistrationStatus),
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
