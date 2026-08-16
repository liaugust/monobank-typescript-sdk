import { MonobankValidationError } from "../errors/monobank-validation-error.js";

const webhookEndpoint = "/personal/webhook";

/**
 * Input for setting or removing a Personal webhook URL.
 */
export interface SetWebhookInput {
  /** Absolute HTTP(S) webhook URL, or an empty string to remove the configured webhook. */
  readonly webHookUrl: string;
}

/**
 * Validates and builds the JSON body for `/personal/webhook`.
 *
 * Monobank removes the configured webhook when `webHookUrl` is an empty
 * string. Non-empty values must be absolute HTTP(S) URLs.
 * @param input Webhook configuration request.
 * @returns JSON-serializable request body accepted by Monobank.
 * @throws {MonobankValidationError} When the URL is relative or uses a non-HTTP(S) protocol.
 */
export function createSetWebhookBody(input: SetWebhookInput): {
  readonly webHookUrl: string;
} {
  if (input.webHookUrl.length === 0) {
    return { webHookUrl: "" };
  }

  let url: URL;
  try {
    url = new URL(input.webHookUrl);
  } catch {
    throw createInvalidWebhookUrlError();
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw createInvalidWebhookUrlError();
  }

  return { webHookUrl: input.webHookUrl };
}

function createInvalidWebhookUrlError(): MonobankValidationError {
  return new MonobankValidationError({
    endpoint: webhookEndpoint,
    issues: ["webHookUrl must be an empty string or an absolute HTTP(S) URL"],
    message: "Invalid Personal webhook request.",
  });
}
