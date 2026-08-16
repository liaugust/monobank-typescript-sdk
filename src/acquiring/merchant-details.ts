import * as z from "zod/mini";

/**
 * Runtime validator for the authenticated `/api/merchant/details` response.
 *
 * Unknown additive fields are preserved so compatible upstream additions are
 * available without requiring an SDK release.
 */
export const merchantDetailsSchema = z.looseObject({
  edrpou: z.string(),
  merchantId: z.string(),
  merchantName: z.string(),
});

/** Monobank Acquiring merchant identity associated with the supplied token. */
export type MerchantDetails = z.infer<typeof merchantDetailsSchema>;
