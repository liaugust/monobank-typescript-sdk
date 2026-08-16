import { describe, expect, it } from "vitest";

import { clientInfoFixture } from "../../../../tests/fixtures/personal/client-info.js";
import { jarSchema } from "./jar.js";

const jarFixture = clientInfoFixture.jars[0];

describe("jar schema", () => {
  it("accepts a Personal jar with balance and goal in minor units", () => {
    expect(jarSchema.parse(jarFixture)).toEqual(jarFixture);
  });

  it("rejects malformed jar fields", () => {
    const result = jarSchema.safeParse({
      ...jarFixture,
      balance: "1000000",
      currencyCode: "980",
      goal: 10_000_000.5,
      sendId: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["balance"] }),
          expect.objectContaining({ path: ["currencyCode"] }),
          expect.objectContaining({ path: ["goal"] }),
          expect.objectContaining({ path: ["sendId"] }),
        ]),
      );
    }
  });

  it("preserves unknown additive jar fields", () => {
    const payload = { ...jarFixture, savingsRule: "rounding" } as const;

    expect(jarSchema.parse(payload)).toEqual(payload);
  });
});
