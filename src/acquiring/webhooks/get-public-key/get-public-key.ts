import * as z from "zod/mini";

/** Root-relative endpoint for the authenticated Acquiring webhook public key. */
export const getAcquiringWebhookPublicKeyEndpoint = "/api/merchant/pubkey";

/**
 * Runtime validator for the authenticated `/api/merchant/pubkey` response.
 *
 * Unknown additive fields are preserved so compatible upstream additions are
 * available without requiring an SDK release.
 */
export const acquiringWebhookPublicKeySchema = z.looseObject({
  key: z.string(),
});

/** Base64-encoded X.509 ECDSA public key used to authenticate Acquiring webhooks. */
export type AcquiringWebhookPublicKey = z.infer<
  typeof acquiringWebhookPublicKeySchema
>;
