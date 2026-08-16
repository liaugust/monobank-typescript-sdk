import * as z from "zod/mini";

/** Importable values accepted by Monobank's Personal account `type` field. */
export const AccountType = {
  Black: "black",
  EAid: "eAid",
  Fop: "fop",
  Iron: "iron",
  Platinum: "platinum",
  White: "white",
  Yellow: "yellow",
} as const;

/** A documented value from Monobank's Personal account `type` field. */
export type AccountType = (typeof AccountType)[keyof typeof AccountType];

/** Importable values accepted by Monobank's Personal account `cashbackType` field. */
export const CashbackType = {
  Miles: "Miles",
  None: "None",
  UAH: "UAH",
} as const;

/** A documented value from Monobank's Personal account `cashbackType` field. */
export type CashbackType = (typeof CashbackType)[keyof typeof CashbackType];

/**
 * Runtime validator for a Personal account returned by `/personal/client-info`.
 *
 * Monetary integers are represented in the account currency's minor units and
 * `currencyCode` is the ISO 4217 numeric currency code.
 */
export const accountSchema = z.looseObject({
  balance: z.int(),
  cashbackType: z.enum(CashbackType),
  creditLimit: z.int(),
  currencyCode: z.int(),
  iban: z.string(),
  id: z.string(),
  maskedPan: z.array(z.string()),
  sendId: z.string(),
  type: z.enum(AccountType),
});

/**
 * Personal account data validated from Monobank's wire response, with additive fields preserved.
 */
export type Account = z.infer<typeof accountSchema>;
