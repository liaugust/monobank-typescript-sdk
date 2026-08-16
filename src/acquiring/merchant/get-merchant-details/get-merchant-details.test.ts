import { describe, expect, it } from "vitest";

import { merchantDetailsFixture } from "../../../../tests/fixtures/acquiring-api.js";
import { merchantDetailsSchema } from "./get-merchant-details.js";

describe("merchant details schema", () => {
  it("accepts complete merchant identity data", () => {
    expect(merchantDetailsSchema.parse(merchantDetailsFixture)).toEqual(
      merchantDetailsFixture,
    );
  });

  it("rejects malformed required merchant fields", () => {
    const result = merchantDetailsSchema.safeParse({
      edrpou: 4_242_424_242,
      merchantId: null,
      merchantName: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["edrpou"] }),
          expect.objectContaining({ path: ["merchantId"] }),
          expect.objectContaining({ path: ["merchantName"] }),
        ]),
      );
    }
  });

  it("preserves unknown additive merchant fields", () => {
    const payload = {
      ...merchantDetailsFixture,
      acquiringFeatures: ["invoice", "wallet"],
    } as const;

    expect(merchantDetailsSchema.parse(payload)).toEqual(payload);
  });
});
