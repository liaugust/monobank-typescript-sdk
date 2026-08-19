import { MonobankResponseValidationError } from "../../errors/monobank-response-validation-error.js";

/** A successful non-JSON response body and the content type Monobank declared. */
export interface MonobankBinaryPayload {
  /** Raw response bytes, decoded by neither the transport nor a schema. */
  readonly bytes: Uint8Array;
  /** Declared `Content-Type`, absent when Monobank sent none. */
  readonly contentType: string | undefined;
}

/**
 * Reads a successful response whose body is not JSON.
 *
 * The package validates every successful JSON payload against a schema, and a
 * binary body cannot cross that boundary. The check that replaces it is
 * emptiness: a zero-length success is a broken response rather than an empty
 * document, so it fails here instead of reaching the caller as a valid file. The
 * declared content type is returned rather than enforced, because Monobank
 * documents the media type in prose and rejecting an unexpected one would refuse
 * a body the caller could still use.
 * @param response Successful Fetch response.
 * @param endpoint Endpoint that produced it.
 * @returns Raw bytes and the declared content type.
 * @throws {MonobankResponseValidationError} When the successful body is empty.
 */
export async function readBinaryPayload(
  response: Response,
  endpoint: string,
): Promise<MonobankBinaryPayload> {
  const buffer = await response.arrayBuffer();

  if (buffer.byteLength === 0) {
    throw new MonobankResponseValidationError({
      endpoint,
      issues: [
        {
          code: "empty_body",
          message: "Response body is empty.",
          path: [],
        },
      ],
      message: "Monobank returned a successful response with no body.",
    });
  }

  return {
    bytes: new Uint8Array(buffer),
    contentType: response.headers.get("Content-Type") ?? undefined,
  };
}
