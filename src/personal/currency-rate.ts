import * as z from "zod/mini";

/**
 * Runtime validator for one `/bank/currency` item with ISO 4217 numeric currency codes and a Unix-second quote timestamp.
 */
export const currencyRateSchema = z
  .looseObject({
    currencyCodeA: z.int(),
    currencyCodeB: z.int(),
    date: z.int(),
    rateBuy: z.optional(z.number()),
    rateCross: z.optional(z.number()),
    rateSell: z.optional(z.number()),
  })
  .check(
    z.refine(
      ({ rateBuy, rateCross, rateSell }) =>
        rateBuy !== undefined ||
        rateCross !== undefined ||
        rateSell !== undefined,
      { message: "At least one exchange rate is required" },
    ),
  );

/**
 * Runtime validator for the public `/bank/currency` response array returned without Personal authentication.
 */
export const currencyRatesSchema = z.array(currencyRateSchema);

/**
 * Public currency quote returned by Monobank with ISO 4217 numeric currency codes and Unix-second quote time.
 */
export type CurrencyRate = z.infer<typeof currencyRateSchema>;
