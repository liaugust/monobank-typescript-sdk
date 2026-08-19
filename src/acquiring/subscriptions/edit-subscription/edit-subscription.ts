import * as z from "zod/mini";

import { parseMonobankRequest } from "../../../shared/request-validation.js";

/** Root-relative endpoint used to act on an existing Acquiring subscription. */
export const editAcquiringSubscriptionEndpoint =
  "/api/merchant/subscription/edit";

/** Importable values accepted by the Acquiring subscription `action` field. */
export const AcquiringSubscriptionAction = {
  Cancel: "cancel",
} as const;

/** A documented action that can be taken on an Acquiring subscription. */
export type AcquiringSubscriptionAction =
  (typeof AcquiringSubscriptionAction)[keyof typeof AcquiringSubscriptionAction];

const editAcquiringSubscriptionSchema = z.object({
  action: z.enum(AcquiringSubscriptionAction),
  refundAmount: z.optional(z.int()),
  subscriptionId: z
    .string()
    .check(z.refine((value) => value.length > 0 && value.trim() === value)),
});

type EditAcquiringSubscriptionBody = z.output<
  typeof editAcquiringSubscriptionSchema
>;

/** Input for acting on an existing Acquiring subscription. */
export interface EditAcquiringSubscriptionInput {
  /** Action to take; Monobank documents only cancellation today. */
  readonly action: AcquiringSubscriptionAction;
  /**
   * Optional refund in the currency's minor units.
   *
   * Monobank refunds nothing when this is omitted, so cancelling and refunding
   * are one request rather than two.
   */
  readonly refundAmount?: number;
  /** Subscription to act on. */
  readonly subscriptionId: string;
}

/**
 * Validates and builds an edit-subscription JSON body.
 * @param input Action, subscription identifier, and optional refund amount.
 * @returns Validated JSON-serializable request body.
 * @throws {MonobankValidationError} When the action is undocumented, the identifier is blank, or the refund amount is not an integer.
 */
export function createEditAcquiringSubscriptionBody(
  input: EditAcquiringSubscriptionInput,
): EditAcquiringSubscriptionBody {
  return parseMonobankRequest(
    editAcquiringSubscriptionSchema,
    input,
    editAcquiringSubscriptionEndpoint,
    "Invalid Acquiring subscription request.",
  );
}
