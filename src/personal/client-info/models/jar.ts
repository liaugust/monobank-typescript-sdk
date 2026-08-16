import * as z from "zod/mini";

/**
 * Runtime validator for a Personal jar returned by `/personal/client-info`.
 *
 * `balance` and `goal` are integer monetary amounts in minor currency units;
 * `currencyCode` is the ISO 4217 numeric currency code.
 */
export const jarSchema = z.looseObject({
  balance: z.int(),
  currencyCode: z.int(),
  description: z.string(),
  goal: z.int(),
  id: z.string(),
  sendId: z.string(),
  title: z.string(),
});

/**
 * Personal jar data validated from Monobank's wire response, including unknown additive fields.
 */
export type Jar = z.infer<typeof jarSchema>;
