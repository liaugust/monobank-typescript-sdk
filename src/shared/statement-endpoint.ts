import { MonobankValidationError } from "../errors/monobank-validation-error.js";
import type { UnixTimeInput } from "./unix-time.js";
import { normalizeUnixTime } from "./unix-time.js";

const statementWindowMaxSeconds = 2_682_000;
const statementsEndpoint = "/personal/statement";

/** Account and time window shared by Personal and delegated Corporate statements. */
export interface StatementWindowInput {
  /** Account or jar identifier; omission defaults to `0`. */
  readonly account?: string;
  /** Inclusive statement window start as Unix seconds or a `Date`. */
  readonly from: UnixTimeInput;
  /** Optional inclusive statement window end as Unix seconds or a `Date`. */
  readonly to?: UnixTimeInput;
}

/**
 * Builds and validates the statement endpoint path.
 *
 * The account is encoded as one path segment, `to` is omitted when not
 * supplied, and the inclusive requested window must not exceed 2,682,000
 * seconds. Both credential families address the same URL, so the caller
 * supplies only the message that names its own request.
 * @param input Statement account and time-window request.
 * @param message Resource-specific validation error message.
 * @returns Root-relative `/personal/statement` endpoint path.
 * @throws {MonobankValidationError} When account or Unix-second values are invalid.
 */
export function createStatementEndpointPath(
  input: StatementWindowInput,
  message: string,
): string {
  const account = resolveStatementAccount(input.account);
  const from = normalizeStatementUnixTime(input.from, "from", message);
  const to =
    input.to === undefined
      ? undefined
      : normalizeStatementUnixTime(input.to, "to", message);
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
      message,
    });
  }

  const prefix = `${statementsEndpoint}/${encodeURIComponent(account as string)}/${String(from)}`;

  return to === undefined ? prefix : `${prefix}/${String(to)}`;
}

function resolveStatementAccount(account: string | undefined): unknown {
  if (account === undefined) {
    return "0";
  }

  return account;
}

function normalizeStatementUnixTime(
  value: UnixTimeInput,
  name: "from" | "to",
  message: string,
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
      message,
    });
  }

  return normalized;
}
