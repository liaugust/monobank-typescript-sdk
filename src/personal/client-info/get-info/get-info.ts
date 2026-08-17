import * as z from "zod/mini";

import type { Account } from "../models/account.js";
import { accountSchema } from "../models/account.js";
import type { Jar } from "../models/jar.js";
import { jarSchema } from "../models/jar.js";
import type {
  ManagedAccount,
  ManagedClient,
} from "../models/managed-client.js";
import { managedClientSchema } from "../models/managed-client.js";

/** Authenticated endpoint for Personal client information. */
export const getClientInfoEndpoint = "/personal/client-info";

/**
 * Runtime validator for the authenticated `/personal/client-info` response.
 *
 * Monobank documents no required fields on this response, and its own sample
 * for a granted corporate client omits `jars` entirely, so `jars`,
 * `permissions`, and `webHookUrl` are optional. Only `clientId`, `name`, and
 * `accounts` are required, because every documented sample carries them and the
 * response is not useful without accounts.
 *
 * Account and jar monetary values remain integer minor units, `permissions`
 * contains Monobank's upstream capability flags, and `managedClients` is
 * optional for Personal accounts without delegated FOP access.
 */
export const clientInfoSchema = z.looseObject({
  accounts: z.array(accountSchema),
  clientId: z.string(),
  jars: z.optional(z.array(jarSchema)),
  managedClients: z.optional(z.array(managedClientSchema)),
  name: z.string(),
  permissions: z.optional(z.string()),
  webHookUrl: z.optional(z.string()),
});

/**
 * Authenticated Personal client profile, accounts, jars, permissions, and optional delegated FOP clients.
 */
export type ClientInfo = z.infer<typeof clientInfoSchema> & {
  readonly accounts: readonly Account[];
  readonly jars?: readonly Jar[] | undefined;
  readonly managedClients?:
    | readonly (ManagedClient & {
        readonly accounts: readonly ManagedAccount[];
      })[]
    | undefined;
};
