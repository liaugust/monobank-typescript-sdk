import * as z from "zod/mini";

import { MonobankValidationError } from "../../errors/monobank-validation-error.js";

/**
 * Runtime validator for a Покупка Частинами order callback body.
 *
 * Monobank sends a callback only for terminal outcomes; intermediate states such
 * as `IN_PROCESS/WAITING_FOR_CLIENT` are not delivered and have to be polled with
 * `orders.getState()`. `state` and `order_sub_state` are strings rather than
 * enums because the documented status table is prose, not a declared enum.
 */
export const installmentsCallbackEventSchema = z.looseObject({
  order_id: z.string(),
  order_sub_state: z.optional(z.string()),
  state: z.optional(z.string()),
});

/** Validated Покупка Частинами order callback body. */
export type InstallmentsCallbackEvent = z.infer<
  typeof installmentsCallbackEventSchema
>;

/**
 * Validates the shape of a Покупка Частинами callback body.
 *
 * This is shape validation only. It proves nothing about who sent the request, so
 * authenticate delivery with `verifyInstallmentsCallbackSignature()` over the raw
 * bytes before parsing or acting on the result.
 * @param payload Parsed callback body.
 * @returns Validated callback event.
 * @throws {MonobankValidationError} When the payload does not match the callback schema.
 */
export function parseInstallmentsCallbackEvent(
  payload: unknown,
): InstallmentsCallbackEvent {
  const parsed = installmentsCallbackEventSchema.safeParse(payload);

  if (!parsed.success) {
    throw new MonobankValidationError({
      endpoint: "parse-installments-callback-event",
      issues: parsed.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      ),
      message: "Invalid Monobank installments callback payload.",
    });
  }

  return parsed.data;
}
