import { requireAbsoluteHttpUrl } from "./http-url.js";

/** JSON body shared by the Personal and Corporate webhook mutations. */
export interface WebhookBody {
  /** Absolute HTTP(S) webhook URL, or an empty string to remove the configured webhook. */
  readonly webHookUrl: string;
}

/**
 * Validates and builds the JSON body for a webhook mutation.
 *
 * Monobank removes the configured webhook when `webHookUrl` is an empty
 * string. Non-empty values must be absolute HTTP(S) URLs.
 * @param webHookUrl Requested webhook address.
 * @param endpoint Endpoint receiving the mutation.
 * @param message Resource-specific validation error message.
 * @returns JSON-serializable request body accepted by Monobank.
 * @throws {MonobankValidationError} When the URL is relative or uses a non-HTTP(S) protocol.
 */
export function createWebhookBody(
  webHookUrl: string,
  endpoint: string,
  message: string,
): WebhookBody {
  if (webHookUrl.length === 0) {
    return { webHookUrl: "" };
  }

  requireAbsoluteHttpUrl(webHookUrl, "webHookUrl", endpoint, message);

  return { webHookUrl };
}
