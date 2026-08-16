import { describe, expect, it } from "vitest";

import { bankSyncFixture } from "../../../../tests/fixtures/public/bank.js";
import { bankSyncSchema } from "./get-sync.js";

describe("bank sync schema", () => {
  it("accepts required public synchronization metadata", () => {
    expect(bankSyncSchema.parse(bankSyncFixture)).toEqual(bankSyncFixture);
  });

  it("rejects missing synchronization fields", () => {
    const result = bankSyncSchema.safeParse({
      serverKeyId: bankSyncFixture.serverKeyId,
      serverPubKey: bankSyncFixture.serverPubKey,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({ path: ["serverTimeMsec"] }),
      ]);
    }
  });

  it("rejects invalid synchronization field types", () => {
    const result = bankSyncSchema.safeParse({
      serverKeyId: 2626,
      serverPubKey: null,
      serverTimeMsec: 1_755_509_467_397.5,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["serverKeyId"] }),
          expect.objectContaining({ path: ["serverPubKey"] }),
          expect.objectContaining({ path: ["serverTimeMsec"] }),
        ]),
      );
    }
  });

  it("preserves unknown additive synchronization fields", () => {
    const payload = {
      ...bankSyncFixture,
      serverRegion: "eu-central",
    } as const;

    expect(bankSyncSchema.parse(payload)).toEqual(payload);
  });
});
