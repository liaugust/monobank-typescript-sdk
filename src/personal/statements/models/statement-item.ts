import * as z from "zod/mini";

/**
 * Runtime validator for a Personal statement item returned by `/personal/statement`.
 *
 * Monetary amounts are signed integer minor units, `currencyCode` is an ISO
 * 4217 numeric currency code, MCC fields are merchant category integers, and
 * `time` is a Unix-second transaction timestamp. Unknown additive fields from
 * Monobank are preserved for forward compatibility.
 */
export const statementItemSchema = z.looseObject({
  amount: z.int(),
  balance: z.int(),
  cashbackAmount: z.int(),
  comment: z.optional(z.string()),
  commissionRate: z.int(),
  counterEdrpou: z.optional(z.string()),
  counterIban: z.optional(z.string()),
  counterName: z.optional(z.string()),
  currencyCode: z.int(),
  description: z.string(),
  hold: z.boolean(),
  id: z.string(),
  invoiceId: z.optional(z.string()),
  mcc: z.int(),
  operationAmount: z.int(),
  originalMcc: z.int(),
  receiptId: z.optional(z.string()),
  time: z.int(),
});

/**
 * Runtime validator for `/personal/statement` response arrays.
 */
export const statementItemsSchema = z.array(statementItemSchema);

/**
 * Personal statement item validated from Monobank's wire response.
 */
export type StatementItem = z.infer<typeof statementItemSchema>;
