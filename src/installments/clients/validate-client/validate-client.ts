import * as z from "zod/mini";

import { parseMonobankRequest } from "../../../shared/request-validation.js";
import { invalidInstallmentsRequestMessage } from "../../shared/request-validation.js";

/** Root-relative endpoint validating a client by phone number. */
export const validateInstallmentsClientEndpoint = "/api/client/validate";

/** Root-relative endpoint validating a client without returning identity data. */
export const validateInstallmentsClientV2Endpoint = "/api/v2/client/validate";

const validateInstallmentsClientSchema = z.object({
  phone: z.string().check(z.refine((value) => /^\+[0-9]{9,15}$/u.test(value))),
});

/** Input identifying the client to validate. */
export interface ValidateInstallmentsClientInput {
  /**
   * Client phone number in international format, such as `+380501234567`.
   *
   * Rejected before Fetch when it does not start with `+` followed by 9 to 15
   * digits, because Monobank documents the international form and a local-format
   * number would otherwise read as an unknown client.
   */
  readonly phone: string;
}

/**
 * Runtime validator for `POST /api/client/validate` responses.
 *
 * `client` is present only when `found` is true, and carries the person's name
 * and tax identifier. Treat it as personal data: log neither field, and prefer
 * `validateV2()` when the answer alone is enough.
 */
export const installmentsClientValidationSchema = z.looseObject({
  client: z.optional(
    z.looseObject({
      first_name: z.optional(z.string()),
      inn: z.optional(z.string()),
      last_name: z.optional(z.string()),
      middle_name: z.optional(z.string()),
    }),
  ),
  found: z.boolean(),
});

/** Validated answer to a client lookup, with the client's identity when found. */
export type InstallmentsClientValidation = z.infer<
  typeof installmentsClientValidationSchema
>;

/** Runtime validator for `POST /api/v2/client/validate` responses. */
export const installmentsClientPresenceSchema = z.looseObject({
  found: z.boolean(),
});

/** Validated answer to a client lookup, without any identity data. */
export type InstallmentsClientPresence = z.infer<
  typeof installmentsClientPresenceSchema
>;

/**
 * Validates and builds a client-validation JSON body.
 * @param input Client phone number in international format.
 * @param endpoint Endpoint receiving the validated body.
 * @returns Validated JSON-serializable request body.
 * @throws {MonobankValidationError} When the phone number is not in international format.
 */
export function createValidateInstallmentsClientBody(
  input: ValidateInstallmentsClientInput,
  endpoint: string,
): ValidateInstallmentsClientInput {
  return parseMonobankRequest(
    validateInstallmentsClientSchema,
    input,
    endpoint,
    invalidInstallmentsRequestMessage,
  );
}
