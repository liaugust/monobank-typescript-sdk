import * as z from "zod/mini";

/** Public endpoint for Monobank currency rates. */
export const getCurrencyRatesEndpoint = "/bank/currency";

/** Runtime validator for one public currency-rate item. */
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

/** Runtime validator for the public currency-rate response array. */
export const currencyRatesSchema = z.array(currencyRateSchema);

/** Public currency quote with ISO 4217 numeric codes and Unix-second quote time. */
export type CurrencyRate = z.infer<typeof currencyRateSchema>;
