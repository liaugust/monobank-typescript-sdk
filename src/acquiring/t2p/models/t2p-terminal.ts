import * as z from "zod/mini";

/**
 * Runtime validator for one tap-to-phone terminal.
 *
 * Only `terminal` is required. Monobank documents this response with a sample
 * rather than a schema, so `code` and `name` stay optional.
 */
export const acquiringT2pTerminalSchema = z.looseObject({
  code: z.optional(z.string()),
  name: z.optional(z.string()),
  terminal: z.string(),
});

/** One validated tap-to-phone terminal. */
export type AcquiringT2pTerminal = z.infer<typeof acquiringT2pTerminalSchema>;

/** Runtime validator for `GET /api/merchant/t2p/terminal/list` responses. */
export const acquiringT2pTerminalListSchema = z.looseObject({
  list: z.array(acquiringT2pTerminalSchema),
});

/** Validated list of the merchant's tap-to-phone terminals. */
export interface AcquiringT2pTerminalList {
  /** Tap-to-phone terminals registered to the merchant. */
  readonly list: readonly AcquiringT2pTerminal[];
  /** Additive response fields preserved by the loose runtime schema. */
  readonly [key: string]: unknown;
}
