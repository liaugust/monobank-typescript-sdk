import { describe, expect, it } from "vitest";

import { currencyRateFixture } from "../../tests/fixtures/personal-api.js";
import { currencyRateSchema, currencyRatesSchema } from "./currency-rate.js";

describe("currency rate schemas", () => {
  it("accepts buy and sell rates from the public currency endpoint", () => {
    expect(currencyRateSchema.parse(currencyRateFixture)).toEqual(
      currencyRateFixture,
    );
    expect(currencyRatesSchema.parse([currencyRateFixture])).toEqual([
      currencyRateFixture,
    ]);
  });

  it("accepts a cross rate without buy or sell rates", () => {
    const crossRate = {
      currencyCodeA: 978,
      currencyCodeB: 980,
      date: 1_552_392_228,
      rateCross: 30.5,
    } as const;

    expect(currencyRateSchema.parse(crossRate)).toEqual(crossRate);
  });

  it("rejects currency rows that do not contain an exchange rate", () => {
    const result = currencyRateSchema.safeParse({
      currencyCodeA: 840,
      currencyCodeB: 980,
      date: 1_552_392_228,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({
          message: "At least one exchange rate is required",
          path: [],
        }),
      ]);
    }
  });

  it("rejects non-integer currency codes and dates", () => {
    const result = currencyRateSchema.safeParse({
      currencyCodeA: 840.5,
      currencyCodeB: "980",
      date: 1_552_392_228.25,
      rateCross: 39.25,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["currencyCodeA"] }),
          expect.objectContaining({ path: ["currencyCodeB"] }),
          expect.objectContaining({ path: ["date"] }),
        ]),
      );
    }
  });

  it("preserves unknown additive currency fields", () => {
    const payload = {
      ...currencyRateFixture,
      rateSpread: 0.2,
    } as const;

    expect(currencyRateSchema.parse(payload)).toEqual(payload);
  });
});
