import { describe, expect, it } from "vitest";

import { clientInfoFixture } from "../../tests/fixtures/personal-api.js";
import { accountSchema } from "./account.js";

const accountFixture = clientInfoFixture.accounts[0];

describe("account schema", () => {
  it("accepts a Personal account with monetary values in minor units", () => {
    expect(accountSchema.parse(accountFixture)).toEqual(accountFixture);
  });

  it("accepts every documented account type", () => {
    const accountTypes = [
      "black",
      "white",
      "platinum",
      "iron",
      "fop",
      "yellow",
      "eAid",
    ] as const;

    expect(
      accountTypes.map((type) =>
        accountSchema.parse({ ...accountFixture, type }),
      ),
    ).toEqual(accountTypes.map((type) => ({ ...accountFixture, type })));
  });

  it("accepts every documented cashback type", () => {
    const cashbackTypes = ["None", "UAH", "Miles"] as const;

    expect(
      cashbackTypes.map((cashbackType) =>
        accountSchema.parse({ ...accountFixture, cashbackType }),
      ),
    ).toEqual(
      cashbackTypes.map((cashbackType) => ({
        ...accountFixture,
        cashbackType,
      })),
    );
  });

  it("rejects malformed account fields", () => {
    const result = accountSchema.safeParse({
      ...accountFixture,
      balance: "10000000",
      cashbackType: "Cash",
      currencyCode: 980.5,
      maskedPan: "537541******1234",
      type: "gold",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["balance"] }),
          expect.objectContaining({ path: ["cashbackType"] }),
          expect.objectContaining({ path: ["currencyCode"] }),
          expect.objectContaining({ path: ["maskedPan"] }),
          expect.objectContaining({ path: ["type"] }),
        ]),
      );
    }
  });

  it("preserves unknown additive account fields", () => {
    const payload = { ...accountFixture, displayName: "Everyday" } as const;

    expect(accountSchema.parse(payload)).toEqual(payload);
  });
});
