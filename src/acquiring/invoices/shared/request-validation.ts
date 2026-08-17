import type { ResponseSchema } from "../../../transport/response-schema.js";
import { parseAcquiringRequest } from "../../shared/request-validation.js";

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
  return parseAcquiringRequest(
    schema,
    input,
    endpoint,
    "Invalid Acquiring invoice request.",
  );
}
