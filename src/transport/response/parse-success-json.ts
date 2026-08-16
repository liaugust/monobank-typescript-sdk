import { MonobankResponseValidationError } from "../../errors/monobank-response-validation-error.js";

export async function parseSuccessJson(
  response: Response,
  endpoint: string,
): Promise<unknown> {
  const text = await response.text();

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new MonobankResponseValidationError({
      endpoint,
      issues: [
        {
          code: "invalid_json",
          message: "Response body is not valid JSON.",
          path: [],
        },
      ],
      message: "Monobank response body was not valid JSON.",
    });
  }
}
