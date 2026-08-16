import * as z from "zod/mini";

/**
 * Runtime validator for a Personal account returned by `/personal/client-info`.
 *
 * Monetary integers are represented in the account currency's minor units and
 * `currencyCode` is the ISO 4217 numeric currency code.
 */
export const accountSchema = z.looseObject({
  balance: z.int(),
  cashbackType: z.enum(["None", "UAH", "Miles"]),
  creditLimit: z.int(),
  currencyCode: z.int(),
  iban: z.string(),
  id: z.string(),
  maskedPan: z.array(z.string()),
  sendId: z.string(),
  type: z.enum(["black", "white", "platinum", "iron", "fop", "yellow", "eAid"]),
});

/**
 * Personal account data validated from Monobank's wire response, with additive fields preserved.
 */
export type Account = z.infer<typeof accountSchema>;
