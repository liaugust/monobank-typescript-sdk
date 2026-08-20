/**
 * Matches nonempty printable ASCII without spaces or control characters.
 *
 * Used for every value this SDK sends verbatim as an HTTP header (tokens, key
 * identifiers, request identifiers, signatures): `Headers.set` throws a bare
 * `TypeError` on a control character, which callers should see as a named
 * validation failure ahead of Fetch rather than a misclassified network error.
 */
export const printableAsciiPattern = /^[!-~]+$/u;

/**
 * Reports whether a value is safe to send verbatim as an HTTP header value.
 * @param value Candidate header value.
 * @returns Whether `value` is nonempty printable ASCII without spaces.
 */
export function isPrintableAscii(value: string): boolean {
  return printableAsciiPattern.test(value);
}

/**
 * Matches nonempty printable ASCII, spaces included, but no control characters.
 *
 * For free-text header values such as CMS attribution, where a space is a
 * normal character (`"Synthetic Shop"`) rather than a sign of malformed input,
 * but a CRLF or other control character must still be rejected ahead of Fetch
 * instead of surfacing as a bare `Headers.set` `TypeError`.
 */
const printableAsciiWithSpacesPattern = /^[\x20-\x7E]+$/u;

/**
 * Reports whether a value is safe to send verbatim as a free-text header value.
 * @param value Candidate header value.
 * @returns Whether `value` is nonempty printable ASCII, spaces allowed, with no control characters.
 */
export function isPrintableAsciiWithSpaces(value: string): boolean {
  return printableAsciiWithSpacesPattern.test(value);
}
