import { parseMonobankRequest } from "../../../shared/request-validation.js";
import type { ResponseSchema } from "../../../transport/response-schema.js";

/**
 * Parses Acquiring invoice request data ahead of Fetch.
 * @param schema Runtime request schema.
 * @param input Untrusted method input.
 * @param endpoint Endpoint receiving the validated data.
 * @returns Parsed request data.
 * @throws {MonobankValidationError} When the input does not match the request schema.
 */
export function parseInvoiceRequest<T>(
  schema: ResponseSchema<T>,
  input: unknown,
  endpoint: string,
): T {
  return parseMonobankRequest(
    schema,
    input,
    endpoint,
    "Invalid Acquiring invoice request.",
  );
}
