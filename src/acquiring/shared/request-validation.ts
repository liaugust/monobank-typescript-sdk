import { MonobankValidationError } from "../../errors/monobank-validation-error.js";
import type { ResponseSchema } from "../../transport/response-schema.js";

/**
 * Parses Acquiring request data and converts schema issues into the SDK validation error.
 * @param schema Runtime request schema.
 * @param input Untrusted method input.
 * @param endpoint Endpoint receiving the validated data.
 * @param message Resource-specific validation error message.
 * @returns Parsed request data.
 * @throws {MonobankValidationError} When the input does not match the request schema.
 */
export function parseAcquiringRequest<T>(
  schema: ResponseSchema<T>,
  input: unknown,
  endpoint: string,
  message: string,
): T {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    throw new MonobankValidationError({
      endpoint,
      issues: parsed.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      ),
      message,
    });
  }

  return parsed.data;
}
