/**
 * Parses a Retry-After header into a millisecond delay for retry scheduling.
 *
 * @param value Header value from the upstream response, or null when absent.
 * @param nowMs Current Unix time in milliseconds used for HTTP-date values.
 * @returns Delay in milliseconds, zero for past dates, or undefined when invalid.
 */
export function parseRetryAfter(
  value: string | null,
  nowMs: number,
): number | undefined {
  if (value === null) {
    return undefined;
  }

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.round(seconds * 1_000);
  }

  const dateMs = Date.parse(value);
  return Number.isNaN(dateMs) ? undefined : Math.max(0, dateMs - nowMs);
}
