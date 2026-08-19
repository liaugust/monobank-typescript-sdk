import * as z from "zod/mini";

import { requireAbsoluteHttpUrl } from "../../../shared/http-url.js";

/** Optional controls for initializing delegated client access. */
export interface RequestCorporateAccessInput {
  /**
   * Absolute HTTP(S) address Monobank calls once the client approves access.
   *
   * Sent as `X-Callback`. Monobank issues a GET to it carrying `X-Request-Id`.
   */
  readonly callbackUrl?: string;
}

/** Root-relative endpoint for initializing delegated client access. */
export const requestCorporateAccessEndpoint = "/personal/auth/request";

/**
 * Runtime validator for the `/personal/auth/request` response.
 *
 * Monobank documents both fields but marks neither required, so both stay
 * optional and additive upstream fields are preserved.
 */
export const corporateTokenRequestSchema = z.looseObject({
  acceptUrl: z.optional(z.string()),
  tokenRequestId: z.optional(z.string()),
});

/** Access request a client must approve before delegated reads succeed. */
export type CorporateTokenRequest = z.infer<typeof corporateTokenRequestSchema>;

/**
 * Builds the optional `X-Callback` header for an access request.
 * @param input Optional callback address.
 * @returns Headers to send, empty when no callback was supplied.
 * @throws {MonobankValidationError} When the callback address is not an absolute HTTP(S) URL.
 */
export function createRequestCorporateAccessHeaders(
  input: RequestCorporateAccessInput,
): Record<string, string> {
  if (input.callbackUrl === undefined) {
    return {};
  }

  requireAbsoluteHttpUrl(
    input.callbackUrl,
    "callbackUrl",
    requestCorporateAccessEndpoint,
    "Invalid corporate access request.",
  );

  return { "X-Callback": input.callbackUrl };
}
