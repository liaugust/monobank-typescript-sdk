import * as z from "zod/mini";

import { parseMonobankRequest } from "../../../shared/request-validation.js";

/** Company details submitted with a Corporate authorization application. */
export interface RegisterCorporateCompanyInput {
  /** Contact person name. */
  readonly contactPerson: string;
  /** Description of the company's service and its intended API use. */
  readonly description: string;
  /** Contact person email address. */
  readonly email: string;
  /** Company logo image, base64 encoded. */
  readonly logo: string;
  /** Company name. */
  readonly name: string;
  /** Contact person phone number. */
  readonly phone: string;
  /** PEM file with the secp256k1 public key, base64 encoded. */
  readonly pubkey: string;
}

export const registerCorporateCompanyEndpoint = "/personal/auth/registration";

const nonemptyString = () =>
  z.string().check(z.refine((value) => value.trim().length > 0));

const registerCorporateCompanySchema = z.object({
  contactPerson: nonemptyString(),
  description: nonemptyString(),
  email: nonemptyString(),
  logo: nonemptyString(),
  name: nonemptyString(),
  phone: nonemptyString(),
  pubkey: nonemptyString(),
});

/**
 * Runtime validator for the `/personal/auth/registration` response.
 *
 * Monobank documents a `status` field but marks nothing required, so every
 * field stays optional and additive upstream fields are preserved.
 */
export const corporateRegistrationSchema = z.looseObject({
  status: z.optional(z.string()),
});

/** Acknowledgement returned for a submitted authorization application. */
export type CorporateRegistration = z.infer<typeof corporateRegistrationSchema>;

/**
 * Validates the registration application ahead of Fetch.
 * @param input Company details for the application.
 * @returns Parsed request body.
 * @throws {MonobankValidationError} When any documented required field is missing or blank.
 */
export function parseRegisterCorporateCompanyInput(
  input: RegisterCorporateCompanyInput,
): RegisterCorporateCompanyInput {
  return parseMonobankRequest(
    registerCorporateCompanySchema,
    input,
    registerCorporateCompanyEndpoint,
    "Invalid corporate registration request.",
  );
}
