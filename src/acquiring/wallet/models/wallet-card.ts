import * as z from "zod/mini";

/** Runtime validator for one tokenized card stored in a merchant wallet. */
export const acquiringWalletCardSchema = z.looseObject({
  cardToken: z.string(),
  country: z.optional(z.string()),
  maskedPan: z.string(),
});

/** One validated tokenized card stored in a merchant wallet. */
export type AcquiringWalletCard = z.infer<typeof acquiringWalletCardSchema>;

/** Runtime validator for `GET /api/merchant/wallet` responses. */
export const acquiringWalletSchema = z.looseObject({
  wallet: z.array(acquiringWalletCardSchema),
});

/** Validated merchant wallet response. */
export interface AcquiringWallet {
  /** Tokenized cards stored for the requested wallet. */
  readonly wallet: readonly AcquiringWalletCard[];
  /** Additive response fields preserved by the loose runtime schema. */
  readonly [key: string]: unknown;
}
