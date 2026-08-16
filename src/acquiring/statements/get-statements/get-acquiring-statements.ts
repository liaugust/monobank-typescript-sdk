import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import type { UnixTimeInput } from "../../../shared/unix-time.js";
import { normalizeUnixTime } from "../../../shared/unix-time.js";

/** Accepted timestamp input for Acquiring statement requests. */
export type AcquiringStatementUnixTimeInput = UnixTimeInput;

/** Input for fetching an Acquiring transaction statement. */
export interface GetAcquiringStatementsInput {
  /** Optional submerchant terminal identifier. */
  readonly code?: string;
  /** Statement window start as Unix seconds or a `Date`. */
  readonly from: AcquiringStatementUnixTimeInput;
  /** Optional statement window end as Unix seconds or a `Date`. */
  readonly to?: AcquiringStatementUnixTimeInput;
}

const acquiringStatementsEndpoint = "/api/merchant/statement";

/**
 * Builds the encoded Acquiring statement endpoint.
 * @param input Statement time window and optional submerchant terminal identifier.
 * @returns Root-relative statement endpoint with encoded query parameters.
 * @throws {MonobankValidationError} When timestamps or the optional terminal code are invalid.
 */
export function createAcquiringStatementsEndpoint(
  input: GetAcquiringStatementsInput,
): string {
  const from = normalizeAcquiringStatementUnixTime(input.from, "from");
  const to =
    input.to === undefined
      ? undefined
      : normalizeAcquiringStatementUnixTime(input.to, "to");
  const issues: string[] = [];

  if (to !== undefined && from > to) {
    issues.push("from must be less than or equal to to");
  }

  if (
    input.code !== undefined &&
    (input.code.length === 0 || input.code.trim() !== input.code)
  ) {
    issues.push("code must be non-empty without surrounding whitespace");
  }

  if (issues.length > 0) {
    throwInvalidAcquiringStatementRequest(issues);
  }

  const search = new URLSearchParams({
    from: String(from),
  });

  if (to !== undefined) {
    search.set("to", String(to));
  }

  if (input.code !== undefined) {
    search.set("code", input.code);
  }

  return `${acquiringStatementsEndpoint}?${search.toString()}`;
}

function normalizeAcquiringStatementUnixTime(
  value: AcquiringStatementUnixTimeInput,
  name: "from" | "to",
): number {
  const normalized = normalizeUnixTime(value);

  if (normalized === undefined) {
    throwInvalidAcquiringStatementRequest([
      value instanceof Date
        ? `${name} must be a valid Date or Unix-second integer`
        : `${name} must be a finite nonnegative Unix-second integer`,
    ]);
  }

  return normalized;
}

function throwInvalidAcquiringStatementRequest(
  issues: readonly string[],
): never {
  throw new MonobankValidationError({
    endpoint: acquiringStatementsEndpoint,
    issues,
    message: "Invalid Acquiring statement request.",
  });
}
