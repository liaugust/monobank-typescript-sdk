import * as z from "zod/mini";

import type { Account } from "./account.js";
import { accountSchema } from "./account.js";
import type { Jar } from "./jar.js";
import { jarSchema } from "./jar.js";
import type { ManagedAccount, ManagedClient } from "./managed-client.js";
import { managedClientSchema } from "./managed-client.js";

/**
 * Runtime validator for the authenticated `/personal/client-info` response.
 *
 * Account and jar monetary values remain integer minor units, `permissions`
 * contains Monobank's upstream capability flags, and `managedClients` is
 * optional for Personal accounts without delegated FOP access.
 */
export const clientInfoSchema = z.looseObject({
  accounts: z.array(accountSchema),
  clientId: z.string(),
  jars: z.array(jarSchema),
  managedClients: z.optional(z.array(managedClientSchema)),
  name: z.string(),
  permissions: z.string(),
  webHookUrl: z.string(),
});

/**
 * Authenticated Personal client profile, accounts, jars, permissions, and optional delegated FOP clients.
 */
export type ClientInfo = z.infer<typeof clientInfoSchema> & {
  readonly accounts: readonly Account[];
  readonly jars: readonly Jar[];
  readonly managedClients?:
    | readonly (ManagedClient & {
        readonly accounts: readonly ManagedAccount[];
      })[]
    | undefined;
};
