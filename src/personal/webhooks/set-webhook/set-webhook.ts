import type { WebhookBody } from "../../../shared/webhook-body.js";
import { createWebhookBody } from "../../../shared/webhook-body.js";

/** Root-relative endpoint for authenticated Personal webhook configuration. */
export const setWebhookEndpoint = "/personal/webhook";

/**
 * Input for setting or removing a Personal webhook URL.
 */
export interface SetWebhookInput {
  /** Absolute HTTP(S) webhook URL, or an empty string to remove the configured webhook. */
  readonly webHookUrl: string;
}

/**
 * Validates and builds the JSON body for `/personal/webhook`.
 * @param input Webhook configuration request.
 * @returns JSON-serializable request body accepted by Monobank.
 * @throws {MonobankValidationError} When the URL is relative or uses a non-HTTP(S) protocol.
 */
export function createSetWebhookBody(input: SetWebhookInput): WebhookBody {
  return createWebhookBody(
    input.webHookUrl,
    setWebhookEndpoint,
    "Invalid Personal webhook request.",
  );
}
