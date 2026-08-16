import { MonobankValidationError } from "../errors/monobank-validation-error.js";

const statementWindowMaxSeconds = 2_682_000;
const statementsEndpoint = "/personal/statement";

/**
 * Accepted timestamp input for Personal statement requests.
 *
 * Numbers must already be finite nonnegative Unix-second integers. `Date`
 * values are normalized to integer Unix seconds at the request boundary.
 */
export type UnixTimeInput = Date | number;

/**
 * Input for fetching Personal account or jar statements.
 */
export interface GetStatementsInput {
  /** Account or jar identifier from `/personal/client-info`; runtime omission defaults to `0`. */
  readonly account: string;
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
  const account =
    (input as { readonly account?: string }).account === undefined
      ? "0"
      : input.account;
  const from = normalizeUnixTime(input.from, "from");
  const to =
    input.to === undefined ? undefined : normalizeUnixTime(input.to, "to");
  const issues: string[] = [];

  if (account.length === 0) {
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

function normalizeUnixTime(value: UnixTimeInput, name: "from" | "to"): number {
  if (value instanceof Date) {
    const milliseconds = value.getTime();

    if (!Number.isFinite(milliseconds)) {
      throw new MonobankValidationError({
        endpoint: statementsEndpoint,
        issues: [`${name} must be a valid Date or Unix-second integer`],
        message: "Invalid Personal statement request.",
      });
    }

    return Math.floor(milliseconds / 1_000);
  }

  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new MonobankValidationError({
      endpoint: statementsEndpoint,
      issues: [`${name} must be a finite nonnegative Unix-second integer`],
      message: "Invalid Personal statement request.",
    });
  }

  return value;
}
