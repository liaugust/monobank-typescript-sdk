import * as z from "zod/mini";

import { MonobankResponseValidationError } from "../errors/monobank-response-validation-error.js";
import type { StatementItem } from "./statement-item.js";
import { statementItemSchema } from "./statement-item.js";

/**
 * Runtime validator for an incoming Personal webhook event payload.
 *
 * Parsing validates only the documented JSON shape. It does not authenticate
 * the sender; consumers must separately verify the delivery channel and any
 * signature material before trusting webhook data.
 */
export const personalWebhookEventSchema = z.looseObject({
  data: z.looseObject({
    account: z.string(),
    statementItem: statementItemSchema,
  }),
  type: z.literal("StatementItem"),
});

/**
 * Incoming Personal webhook event after JSON-shape validation.
 */
export type PersonalWebhookEvent = z.infer<
  typeof personalWebhookEventSchema
> & {
  readonly data: {
    readonly account: string;
    readonly statementItem: StatementItem;
  };
  readonly type: "StatementItem";
};

/**
 * Validates an incoming Personal webhook payload without authenticating the sender.
 *
 * This parser intentionally stores only safe schema issues on failure and never
 * retains the raw webhook object. Signature or origin verification remains a
 * separate application responsibility.
 * @example
 * ```ts
 * const event = parsePersonalWebhookEvent(await request.json());
 * // Verify authenticity separately before acting on event.data.statementItem.
 * ```
 * @param input Parsed JSON value received from a webhook request body.
 * @returns The validated StatementItem webhook event.
 * @throws {MonobankResponseValidationError} When the payload does not match the Personal webhook schema.
 */
export function parsePersonalWebhookEvent(
  input: unknown,
): PersonalWebhookEvent {
  const parsed = personalWebhookEventSchema.safeParse(input);

  if (!parsed.success) {
    throw new MonobankResponseValidationError({
      endpoint: "personal-webhook-event",
      issues: parsed.error.issues,
      message: "Personal webhook payload did not match the expected schema.",
    });
  }

  return parsed.data;
}
