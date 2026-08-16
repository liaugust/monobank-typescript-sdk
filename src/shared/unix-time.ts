/** Timestamp accepted at SDK request boundaries that use Unix seconds. */
export type UnixTimeInput = Date | number;

/**
 * Converts a valid `Date` or Unix-second integer to Unix seconds.
 * @param value Date or numeric Unix-second input.
 * @returns Normalized Unix seconds, or `undefined` when the input is invalid.
 */
export function normalizeUnixTime(value: UnixTimeInput): number | undefined {
  if (value instanceof Date) {
    const milliseconds = value.getTime();

    return Number.isFinite(milliseconds)
      ? Math.floor(milliseconds / 1_000)
      : undefined;
  }

  return Number.isFinite(value) && Number.isInteger(value) && value >= 0
    ? value
    : undefined;
}
