import * as z from "zod/mini";

import { isPrintableAscii } from "../../../shared/printable-ascii.js";
import { parseMonobankRequest } from "../../../shared/request-validation.js";
import type { WebhookBody } from "../../../shared/webhook-body.js";
import { createWebhookBody } from "../../../shared/webhook-body.js";

/** Input for setting or removing the Corporate payment-update webhook. */
export interface SetCorporateWebhookInput {
  /** Value sent as `X-Request-Id` for this call. */
  readonly requestId: string;
  /** Absolute HTTP(S) webhook URL, or an empty string to remove the configured webhook. */
  readonly webHookUrl: string;
}

/** Root-relative endpoint for Corporate payment-update webhook configuration. */
export const setCorporateWebhookEndpoint = "/personal/corp/webhook";

const setCorporateWebhookSchema = z.object({
  requestId: z.string().check(z.refine(isPrintableAscii)),
  webHookUrl: z.string(),
});

/**
 * Validates the webhook mutation and builds its JSON body.
 *
 * `requestId` is validated here rather than relying on the transport, so an
 * untyped caller omitting it fails ahead of Fetch instead of silently sending
 * the signed mutation without `X-Request-Id`.
 * @param input Webhook configuration request.
 * @returns Parsed request identifier and JSON-serializable request body.
 * @throws {MonobankValidationError} When the request identifier is unusable, or the URL is relative or uses a non-HTTP(S) protocol.
 */
export function parseSetCorporateWebhookInput(
  input: SetCorporateWebhookInput,
): { readonly body: WebhookBody; readonly requestId: string } {
  const parsed = parseMonobankRequest(
    setCorporateWebhookSchema,
    input,
    setCorporateWebhookEndpoint,
    "Invalid corporate webhook request.",
  );

  return {
    body: createWebhookBody(
      parsed.webHookUrl,
      setCorporateWebhookEndpoint,
      "Invalid corporate webhook request.",
    ),
    requestId: parsed.requestId,
  };
}
