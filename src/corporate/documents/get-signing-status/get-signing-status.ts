import * as z from "zod/mini";

import { isPrintableAscii } from "../../../shared/printable-ascii.js";
import { parseMonobankRequest } from "../../../shared/request-validation.js";
import { signingDocumentSchema } from "../models/signing-document.js";

/** Input identifying the monoКЕП signing request to inspect. */
export interface GetDocumentSigningStatusInput {
  /** `requestId` returned when the signing request was created. */
  readonly requestId: string;
}

const getSigningStatusPath = "/personal/signature/status";

const signingRequestIdentifierSchema = z.object({
  requestId: z.string().check(z.refine(isPrintableAscii)),
});

/**
 * Runtime validator for the `/personal/signature/status` response.
 *
 * The specification's top-level `required` array lists `status`, `name`, and
 * `hash`, but those properties are defined on the document items rather than the
 * response, so nothing is treated as required here. `documents` is optional for
 * the same reason.
 */
export const documentSigningStatusSchema = z.looseObject({
  documents: z.optional(z.array(signingDocumentSchema)),
});

/** Validated signing progress for every document in a request. */
export type DocumentSigningStatus = z.infer<typeof documentSigningStatusSchema>;

/**
 * Builds the monoКЕП signing status endpoint.
 * @param input Signing request identifier.
 * @returns Root-relative status endpoint with an encoded `requestId` query parameter.
 * @throws {MonobankValidationError} When the identifier is empty or not printable ASCII without spaces.
 */
export function createDocumentSigningStatusEndpoint(
  input: GetDocumentSigningStatusInput,
): string {
  const parsed = parseMonobankRequest(
    signingRequestIdentifierSchema,
    input,
    getSigningStatusPath,
    "Invalid monoKEP status request.",
  );
  const search = new URLSearchParams({ requestId: parsed.requestId });

  return `${getSigningStatusPath}?${search.toString()}`;
}
