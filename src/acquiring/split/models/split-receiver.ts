import * as z from "zod/mini";

/**
 * Runtime validator for one split-payment receiver.
 *
 * The documented `id` is sent as `splitReceiverId` in invoice basket items.
 * `edrpou` identifies a real business; protect counterparty data in storage.
 */
export const acquiringSplitReceiverSchema = z.looseObject({
  edrpou: z.string(),
  id: z.string(),
  name: z.string(),
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
