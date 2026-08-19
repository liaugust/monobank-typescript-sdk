import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";

/**
 * Accepted timestamp input for Acquiring subscription windows.
 *
 * Monobank documents these parameters as RFC-3339 strings, unlike the Unix
 * seconds the Acquiring statement endpoint takes. A `Date` is serialized with
 * `toISOString()`; a string is forwarded unchanged so a caller can send an
 * offset such as `2024-06-26T18:12:44+03:00`.
 */
export type AcquiringSubscriptionDateInput = Date | string;

/** Window and paging parameters shared by the paged subscription reads. */
export interface AcquiringSubscriptionPageInput {
  /** Inclusive window start; required by Monobank. */
  readonly dateFrom: AcquiringSubscriptionDateInput;
  /** Optional window end; Monobank defaults to the current time. */
  readonly dateTo?: AcquiringSubscriptionDateInput;
  /** Optional page size; Monobank defaults to 20. */
  readonly limit?: number;
  /** Optional 1-based page index; Monobank defaults to 1. */
  readonly page?: number;
}

/**
 * Validates a subscription window and builds its query parameters.
 *
 * Ordering is checked here rather than upstream, because Monobank answers a
 * reversed window with an empty result instead of an error.
 * @param input Window and paging parameters.
 * @param endpoint Endpoint receiving the validated parameters.
 * @returns Query parameters carrying the validated window and paging values.
 * @throws {MonobankValidationError} When a timestamp, page size, or page index is invalid, or the window is reversed.
 */
export function createAcquiringSubscriptionPageQuery(
  input: AcquiringSubscriptionPageInput,
  endpoint: string,
): URLSearchParams {
  const issues: string[] = [];
  const dateFrom = normalizeSubscriptionDate(
    input.dateFrom,
    "dateFrom",
    issues,
  );
  const dateTo =
    input.dateTo === undefined
      ? undefined
      : normalizeSubscriptionDate(input.dateTo, "dateTo", issues);

  if (
    dateFrom !== undefined &&
    dateTo !== undefined &&
    Date.parse(dateFrom) > Date.parse(dateTo)
  ) {
    issues.push("dateFrom must be earlier than or equal to dateTo");
  }

  const limit = normalizeSubscriptionCount(input.limit, "limit", issues);
  const page = normalizeSubscriptionCount(input.page, "page", issues);

  if (issues.length > 0 || dateFrom === undefined) {
    throw new MonobankValidationError({
      endpoint,
      issues,
      message: "Invalid Acquiring subscription request.",
    });
  }

  const search = new URLSearchParams({ dateFrom });

  if (dateTo !== undefined) {
    search.set("dateTo", dateTo);
  }

  if (limit !== undefined) {
    search.set("limit", String(limit));
  }

  if (page !== undefined) {
    search.set("page", String(page));
  }

  return search;
}

function normalizeSubscriptionDate(
  value: AcquiringSubscriptionDateInput,
  name: "dateFrom" | "dateTo",
  issues: string[],
): string | undefined {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      issues.push(`${name} must be a valid Date`);

      return undefined;
    }

    return value.toISOString();
  }

  if (
    typeof value !== "string" ||
    value.trim() !== value ||
    Number.isNaN(Date.parse(value))
  ) {
    issues.push(`${name} must be an RFC-3339 timestamp or a valid Date`);

    return undefined;
  }

  return value;
}

function normalizeSubscriptionCount(
  value: number | undefined,
  name: "limit" | "page",
  issues: string[],
): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isInteger(value) || value < 1) {
    issues.push(`${name} must be a positive integer`);

    return undefined;
  }

  return value;
}
