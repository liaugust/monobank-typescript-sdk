import * as z from "zod/mini";

import { parseMonobankRequest } from "../../../shared/request-validation.js";

/** Input identifying the grant whose client identity is being read. */
export interface GetCorporateClientInfoInput {
  /** `tokenRequestId` of the granted access, sent as `X-Request-Id`. */
  readonly requestId: string;
}

/** Root-relative endpoint for a granted client's identity, read under Corporate signing. */
export const corporateClientInfoEndpoint = "/personal/client-info";

const getCorporateClientInfoSchema = z.object({
  requestId: z.string().check(z.refine((value) => /^[!-~]+$/u.test(value))),
});

/**
 * Validates the delegated identity read ahead of Fetch.
 * @param input Grant identifier.
 * @returns Parsed grant identifier.
 * @throws {MonobankValidationError} When the identifier is empty or not printable ASCII without spaces.
 */
export function parseGetCorporateClientInfoInput(
  input: GetCorporateClientInfoInput,
): GetCorporateClientInfoInput {
  return parseMonobankRequest(
    getCorporateClientInfoSchema,
    input,
    corporateClientInfoEndpoint,
    "Invalid corporate client info request.",
  );
}
