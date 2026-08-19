import type { StatementWindowInput } from "../../../shared/statement-endpoint.js";
import { createStatementEndpointPath } from "../../../shared/statement-endpoint.js";

/**
 * Accepted timestamp input for Personal statement requests.
 *
 * Numbers must already be finite nonnegative Unix-second integers. `Date`
 * values are normalized to integer Unix seconds at the request boundary.
 */
export type { UnixTimeInput } from "../../../shared/unix-time.js";

/**
 * Input for fetching Personal account or jar statements.
 */
export interface GetStatementsInput extends StatementWindowInput {
  /** Account or jar identifier from `/personal/client-info`; omission defaults to `0`. */
  readonly account?: string;
}

/**
 * Builds and validates the authenticated statement endpoint path.
 * @param input Statement account and time-window request.
 * @returns Root-relative `/personal/statement` endpoint path.
 * @throws {MonobankValidationError} When account or Unix-second values are invalid.
 */
export function createStatementsEndpoint(input: GetStatementsInput): string {
  return createStatementEndpointPath(
    input,
    "Invalid Personal statement request.",
  );
}
