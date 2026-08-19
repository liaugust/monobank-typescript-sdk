import { MonobankValidationError } from "../errors/monobank-validation-error.js";

/**
 * Requires an absolute HTTP(S) URL.
 *
 * Monobank fetches these addresses itself, so a relative path or a non-HTTP
 * scheme is rejected here rather than sent and failed upstream.
 * @param value Candidate URL.
 * @param field Name of the input that supplied it.
 * @param endpoint Endpoint receiving the value.
 * @param message Resource-specific validation error message.
 * @returns The parsed URL.
 * @throws {MonobankValidationError} When the value is not an absolute HTTP(S) URL.
 */
export function requireAbsoluteHttpUrl(
  value: string,
  field: string,
  endpoint: string,
  message: string,
): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createInvalidUrlError(field, endpoint, message);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw createInvalidUrlError(field, endpoint, message);
  }

  return url;
}

function createInvalidUrlError(
  field: string,
  endpoint: string,
  message: string,
): MonobankValidationError {
  return new MonobankValidationError({
    endpoint,
    issues: [`${field} must be an absolute HTTP(S) URL`],
    message,
  });
}
