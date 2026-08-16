import { describe, expect, it } from "vitest";

import { clientInfoFixture } from "../../../../tests/fixtures/personal/client-info.js";
import { managedAccountSchema, managedClientSchema } from "./managed-client.js";

const managedClientFixture = clientInfoFixture.managedClients[0];
const managedAccountFixture = managedClientFixture.accounts[0];

describe("managed client schemas", () => {
  it("accepts delegated FOP clients with numeric TIN values", () => {
    expect(managedAccountSchema.parse(managedAccountFixture)).toEqual(
      managedAccountFixture,
    );
    expect(managedClientSchema.parse(managedClientFixture)).toEqual(
      managedClientFixture,
    );
  });

  it("accepts delegated FOP clients with string TIN values", () => {
    const stringTinPayload = {
      ...managedClientFixture,
      tin: "1234567890",
    } as const;

    expect(managedClientSchema.parse(stringTinPayload)).toEqual(
      stringTinPayload,
    );
  });

  it("rejects malformed delegated account fields", () => {
    const result = managedAccountSchema.safeParse({
      ...managedAccountFixture,
      balance: "10000000",
      currencyCode: 980.5,
      iban: null,
      type: "black",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["balance"] }),
          expect.objectContaining({ path: ["currencyCode"] }),
          expect.objectContaining({ path: ["iban"] }),
          expect.objectContaining({ path: ["type"] }),
        ]),
      );
    }
  });

  it("rejects malformed delegated client fields", () => {
    const result = managedClientSchema.safeParse({
      ...managedClientFixture,
      accounts: managedClientFixture.accounts[0],
      clientId: 123,
      tin: 1_234_567_890.5,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["accounts"] }),
          expect.objectContaining({ path: ["clientId"] }),
          expect.objectContaining({ path: ["tin"] }),
        ]),
      );
    }
  });

  it("rejects non-string non-numeric delegated client TIN values", () => {
    const result = managedClientSchema.safeParse({
      ...managedClientFixture,
      tin: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({ path: ["tin"] }),
      ]);
    }
  });

  it("preserves unknown additive managed-client fields at every level", () => {
    const payload = {
      ...managedClientFixture,
      accounts: [
        {
          ...managedAccountFixture,
          displayName: "FOP account",
        },
      ],
      delegationStatus: "active",
    } as const;

    expect(managedClientSchema.parse(payload)).toEqual(payload);
  });
});
