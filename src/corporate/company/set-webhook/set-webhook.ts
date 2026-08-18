import type { WebhookBody } from "../../../shared/webhook-body.js";
import { createWebhookBody } from "../../../shared/webhook-body.js";

/** Input for setting or removing the Corporate payment-update webhook. */
export interface SetCorporateWebhookInput {
  /** Value sent as `X-Request-Id` for this call. */
  readonly requestId: string;
  /** Absolute HTTP(S) webhook URL, or an empty string to remove the configured webhook. */
  readonly webHookUrl: string;
}

export const setCorporateWebhookEndpoint = "/personal/corp/webhook";

/**
 * Validates and builds the JSON body for `/personal/corp/webhook`.
 * @param input Webhook configuration request.
 * @returns JSON-serializable request body accepted by Monobank.
 * @throws {MonobankValidationError} When the URL is relative or uses a non-HTTP(S) protocol.
 */
export function createSetCorporateWebhookBody(
  input: SetCorporateWebhookInput,
): WebhookBody {
  return createWebhookBody(
    input.webHookUrl,
    setCorporateWebhookEndpoint,
    "Invalid corporate webhook request.",
  );
}
