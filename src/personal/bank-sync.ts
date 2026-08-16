import * as z from "zod/mini";

/**
 * Runtime validator for public `/bank/sync` metadata used to synchronize server time and verification keys.
 */
export const bankSyncSchema = z.looseObject({
  serverKeyId: z.string(),
  serverPubKey: z.string(),
  serverTimeMsec: z.int(),
});

/**
 * Public bank synchronization metadata with server time expressed as Unix milliseconds.
 */
export type BankSync = z.infer<typeof bankSyncSchema>;
