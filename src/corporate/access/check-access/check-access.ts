import * as z from "zod/mini";

import { parseMonobankRequest } from "../../../shared/request-validation.js";

/** Input identifying the access request whose grant state is being checked. */
export interface CheckCorporateAccessInput {
  /** `tokenRequestId` returned by `access.request()`, sent as `X-Request-Id`. */
  readonly requestId: string;
}

/** Root-relative endpoint for checking a delegated access grant. */
export const checkCorporateAccessEndpoint = "/personal/auth/request";

const checkCorporateAccessSchema = z.object({
  requestId: z.string().check(z.refine((value) => /^[!-~]+$/u.test(value))),
});

/**
 * Validates the access check ahead of Fetch.
 * @param input Request identifier to check.
 * @returns Parsed request identifier.
 * @throws {MonobankValidationError} When the identifier is empty or not printable ASCII without spaces.
 */
export function parseCheckCorporateAccessInput(
  input: CheckCorporateAccessInput,
): CheckCorporateAccessInput {
  return parseMonobankRequest(
    checkCorporateAccessSchema,
    input,
    checkCorporateAccessEndpoint,
    "Invalid corporate access check.",
  );
}
