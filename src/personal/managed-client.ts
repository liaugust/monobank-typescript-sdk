import * as z from "zod/mini";

/**
 * Runtime validator for a delegated FOP account nested under a managed client.
 *
 * Monetary integers are minor currency units and `currencyCode` is the ISO 4217
 * numeric currency code supplied by Monobank.
 */
export const managedAccountSchema = z.looseObject({
  balance: z.int(),
  creditLimit: z.int(),
  currencyCode: z.int(),
  iban: z.string(),
  id: z.string(),
  type: z.literal("fop"),
});

/**
 * Runtime validator for a delegated FOP client available from `/personal/client-info`.
 *
 * Official upstream examples vary between numeric and string `tin`
 * representations, so the validator accepts and preserves either a string or
 * an integer without coercion.
 */
export const managedClientSchema = z.looseObject({
  accounts: z.array(managedAccountSchema),
  clientId: z.string(),
  name: z.string(),
  tin: z.union([z.string(), z.int()]),
});

/**
 * Delegated FOP account data validated from a managed-client wire response.
 */
export type ManagedAccount = z.infer<typeof managedAccountSchema>;

/**
 * Delegated FOP client data validated from Monobank's wire response.
 */
export type ManagedClient = z.infer<typeof managedClientSchema> & {
  readonly accounts: readonly ManagedAccount[];
};
