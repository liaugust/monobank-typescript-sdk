import * as z from "zod/mini";

/**
 * Runtime validator for one split-payment receiver.
 *
 * Only `splitReceiverId` is required, because Monobank documents this response
 * with a sample rather than a schema. `edrpou` is the receiver's Ukrainian
 * state registry code and identifies a real business, so treat it as personal
 * data about that counterparty.
 */
export const acquiringSplitReceiverSchema = z.looseObject({
  edrpou: z.optional(z.string()),
  name: z.optional(z.string()),
  splitReceiverId: z.string(),
});

/** One validated split-payment receiver. */
export type AcquiringSplitReceiver = z.infer<
  typeof acquiringSplitReceiverSchema
>;

/** Runtime validator for `GET /api/merchant/split-receiver/list` responses. */
export const acquiringSplitReceiverListSchema = z.looseObject({
  list: z.array(acquiringSplitReceiverSchema),
});

/** Validated list of receivers a split payment can pay out to. */
export interface AcquiringSplitReceiverList {
  /** Receivers registered for split payments. */
  readonly list: readonly AcquiringSplitReceiver[];
  /** Additive response fields preserved by the loose runtime schema. */
  readonly [key: string]: unknown;
}
