import * as z from "zod/mini";

import { parseMonobankRequest } from "../../../shared/request-validation.js";
import type { StatementWindowInput } from "../../../shared/statement-endpoint.js";
import { createStatementEndpointPath } from "../../../shared/statement-endpoint.js";

/** Input selecting one granted client's statement window. */
export interface GetCorporateClientStatementsInput extends StatementWindowInput {
  /** `tokenRequestId` of the granted access, sent as `X-Request-Id`. */
  readonly requestId: string;
}

const corporateClientStatementsMessage =
  "Invalid corporate client statement request.";

const getCorporateClientStatementsSchema = z.object({
  requestId: z.string().check(z.refine((value) => /^[!-~]+$/u.test(value))),
});

/**
 * Validates the delegated statement read and builds its endpoint path.
 * @param input Grant identifier, account, and time window.
 * @returns Endpoint path and the parsed grant identifier.
 * @throws {MonobankValidationError} When the identifier, account, or Unix-second values are invalid.
 */
export function parseGetCorporateClientStatementsInput(
  input: GetCorporateClientStatementsInput,
): { readonly endpoint: string; readonly requestId: string } {
  const parsed = parseMonobankRequest(
    getCorporateClientStatementsSchema,
    input,
    "/personal/statement",
    corporateClientStatementsMessage,
  );

  return {
    endpoint: createStatementEndpointPath(
      input,
      corporateClientStatementsMessage,
    ),
    requestId: parsed.requestId,
  };
}
