/**
 * Accepted timestamp input for endpoints Monobank documents as RFC-3339.
 *
 * A `Date` is serialized with `toISOString()`; a string is forwarded unchanged
 * so a caller can send an offset such as `2024-06-26T18:12:44+03:00`.
 */
export type Rfc3339TimeInput = Date | string;

/**
 * Normalizes one RFC-3339 timestamp input, collecting a message when invalid.
 *
 * Issues are collected rather than thrown so a caller can report every invalid
 * field of one request together.
 * @param value Untrusted timestamp input.
 * @param name Field name used in the collected issue.
 * @param issues Mutable list receiving a message when the value is unusable.
 * @returns The RFC-3339 string, or `undefined` when an issue was collected.
 */
export function normalizeRfc3339Time(
  value: Rfc3339TimeInput,
  name: string,
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
