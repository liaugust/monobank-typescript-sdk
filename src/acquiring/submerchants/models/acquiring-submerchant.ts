import * as z from "zod/mini";

/** Runtime validator for one Acquiring submerchant. */
export const acquiringSubmerchantSchema = z.looseObject({
  code: z.string(),
  edrpou: z.optional(z.string()),
  iban: z.string(),
  owner: z.optional(z.string()),
});

/** One validated Acquiring submerchant. */
export type AcquiringSubmerchant = z.infer<typeof acquiringSubmerchantSchema>;

/** Runtime validator for `GET /api/merchant/submerchant/list` responses. */
export const acquiringSubmerchantListSchema = z.looseObject({
  list: z.array(acquiringSubmerchantSchema),
});

/** Validated Acquiring submerchant-list response. */
export interface AcquiringSubmerchantList {
  /** Submerchant terminals available to the configured merchant. */
  readonly list: readonly AcquiringSubmerchant[];
  /** Additive response fields preserved by the loose runtime schema. */
  readonly [key: string]: unknown;
}
