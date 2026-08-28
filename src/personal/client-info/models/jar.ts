import * as z from "zod/mini";

/**
 * Runtime validator for a Personal jar returned by `/personal/client-info`.
 *
 * `balance` and `goal` are integer monetary amounts in minor currency units,
 * `goal` is `null` for jars created without a target, and `currencyCode` is
 * the ISO 4217 numeric currency code.
 */
export const jarSchema = z.looseObject({
  balance: z.int(),
  currencyCode: z.int(),
  description: z.string(),
  // The live API returns `goal: null` for jars created without a target.
  goal: z.nullable(z.int()),
  id: z.string(),
  sendId: z.string(),
  title: z.string(),
});

/**
 * Personal jar data validated from Monobank's wire response, including unknown additive fields.
 */
export type Jar = z.infer<typeof jarSchema>;
