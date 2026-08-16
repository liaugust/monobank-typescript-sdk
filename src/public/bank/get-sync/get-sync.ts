import * as z from "zod/mini";

/** Public endpoint for Monobank synchronization metadata. */
export const getBankSyncEndpoint = "/bank/sync";

/** Runtime validator for public synchronization metadata. */
export const bankSyncSchema = z.looseObject({
  serverKeyId: z.string(),
  serverPubKey: z.string(),
  serverTimeMsec: z.int(),
});

/** Public bank synchronization metadata with server time expressed as Unix milliseconds. */
export type BankSync = z.infer<typeof bankSyncSchema>;
