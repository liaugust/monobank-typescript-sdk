import * as z from "zod/mini";

/**
 * Runtime validator for one monopay button signing key.
 *
 * Only `keyId` is required. Monobank documents this response with a sample
 * rather than a schema, so the remaining fields stay optional.
 */
export const monopaySigningKeySchema = z.looseObject({
  expiresAt: z.optional(z.string()),
  keyId: z.string(),
  keyName: z.optional(z.string()),
  keyValue: z.optional(z.string()),
});

/** One validated monopay button signing key. */
export type MonopaySigningKey = z.infer<typeof monopaySigningKeySchema>;

/** Runtime validator for `GET /api/merchant/monopay/pubkey-list` responses. */
export const monopaySigningKeyListSchema = z.looseObject({
  result: z.array(monopaySigningKeySchema),
});

/** Validated list of the merchant's monopay button signing keys. */
export interface MonopaySigningKeyList {
  /** Signing keys registered for the monopay button. */
  readonly result: readonly MonopaySigningKey[];
  /** Additive response fields preserved by the loose runtime schema. */
  readonly [key: string]: unknown;
}
