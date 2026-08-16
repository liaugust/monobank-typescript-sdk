import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import type { UnixTimeInput } from "../../../shared/unix-time.js";
import { normalizeUnixTime } from "../../../shared/unix-time.js";

const statementWindowMaxSeconds = 2_682_000;
const statementsEndpoint = "/personal/statement";

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
export interface GetStatementsInput {
  /** Account or jar identifier from `/personal/client-info`; omission defaults to `0`. */
  readonly account?: string;
  /** Inclusive statement window start as Unix seconds or a `Date`. */
  readonly from: UnixTimeInput;
  /** Optional inclusive statement window end as Unix seconds or a `Date`. */
  readonly to?: UnixTimeInput;
}

/**
 * Builds and validates the authenticated statement endpoint path.
 *
 * The statement account is encoded as one path segment, `to` is omitted when
 * not supplied, and the inclusive requested window must not exceed 2,682,000
 * seconds.
 * @param input Statement account and time-window request.
 * @returns Root-relative `/personal/statement` endpoint path.
 * @throws {MonobankValidationError} When account or Unix-second values are invalid.
 */
export function createStatementsEndpoint(input: GetStatementsInput): string {
  const account = resolveStatementAccount(input.account);
  const from = normalizePersonalStatementUnixTime(input.from, "from");
  const to =
    input.to === undefined
      ? undefined
      : normalizePersonalStatementUnixTime(input.to, "to");
  const issues: string[] = [];

  if (
    typeof account !== "string" ||
    account.length === 0 ||
    account === "." ||
    account === ".."
  ) {
    issues.push("account must be a non-empty path segment");
  }

  if (to !== undefined && from > to) {
    issues.push("from must be less than or equal to to");
  }

  if (to !== undefined && to - from > statementWindowMaxSeconds) {
    issues.push("statement window must not exceed 2682000 seconds");
  }

  if (issues.length > 0) {
    throw new MonobankValidationError({
      endpoint: statementsEndpoint,
      issues,
      message: "Invalid Personal statement request.",
    });
  }

  const encodedAccount = encodeURIComponent(account);
  const prefix = `${statementsEndpoint}/${encodedAccount}/${String(from)}`;

  return to === undefined ? prefix : `${prefix}/${String(to)}`;
}

function resolveStatementAccount(account: string | undefined): string {
  if (account === undefined) {
    return "0";
  }

  return account;
}

function normalizePersonalStatementUnixTime(
  value: UnixTimeInput,
  name: "from" | "to",
): number {
  const normalized = normalizeUnixTime(value);

  if (normalized === undefined) {
    throw new MonobankValidationError({
      endpoint: statementsEndpoint,
      issues: [
        value instanceof Date
          ? `${name} must be a valid Date or Unix-second integer`
          : `${name} must be a finite nonnegative Unix-second integer`,
      ],
      message: "Invalid Personal statement request.",
    });
  }

  return normalized;
}
