import * as z from "zod/mini";

import { isPrintableAscii } from "../../../shared/printable-ascii.js";
import { parseMonobankRequest } from "../../../shared/request-validation.js";

/** Input identifying the monoКЕП signing request to cancel. */
export interface CancelDocumentSigningInput {
  /** `requestId` returned when the signing request was created. */
  readonly requestId: string;
}

const cancelSigningPath = "/personal/signature/cancel";

const cancelSigningSchema = z.object({
  requestId: z.string().check(z.refine(isPrintableAscii)),
});

/**
 * Builds the monoКЕП signing cancellation endpoint.
 * @param input Signing request identifier.
 * @returns Root-relative cancellation endpoint with an encoded `requestId` query parameter.
 * @throws {MonobankValidationError} When the identifier is empty or not printable ASCII without spaces.
 */
export function createCancelDocumentSigningEndpoint(
  input: CancelDocumentSigningInput,
): string {
  const parsed = parseMonobankRequest(
    cancelSigningSchema,
    input,
    cancelSigningPath,
    "Invalid monoKEP cancellation request.",
  );
  const search = new URLSearchParams({ requestId: parsed.requestId });

  return `${cancelSigningPath}?${search.toString()}`;
}
