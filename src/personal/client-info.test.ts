import { describe, expect, it } from "vitest";

import { clientInfoFixture } from "../../tests/fixtures/personal-api.js";
import { clientInfoSchema } from "./client-info.js";

describe("client info schema", () => {
  it("accepts complete Personal client information with accounts, jars, and managed clients", () => {
    expect(clientInfoSchema.parse(clientInfoFixture)).toEqual(
      clientInfoFixture,
    );
  });

  it("accepts omitted managed clients for Personal accounts without delegated FOP access", () => {
    const withoutManagedClients: Record<string, unknown> = {
      ...clientInfoFixture,
    };
    delete withoutManagedClients["managedClients"];

    expect(clientInfoSchema.parse(withoutManagedClients)).toEqual(
      withoutManagedClients,
    );
  });

  it("rejects malformed nested client information fields", () => {
    const result = clientInfoSchema.safeParse({
      ...clientInfoFixture,
      accounts: [
        {
          ...clientInfoFixture.accounts[0],
          balance: "10000000",
        },
      ],
      jars: [
        {
          ...clientInfoFixture.jars[0],
          goal: "10000000",
        },
      ],
      managedClients: [
        {
          ...clientInfoFixture.managedClients[0],
          tin: 1_234_567_890.5,
        },
      ],
      permissions: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["accounts", 0, "balance"] }),
          expect.objectContaining({ path: ["jars", 0, "goal"] }),
          expect.objectContaining({ path: ["managedClients", 0, "tin"] }),
          expect.objectContaining({ path: ["permissions"] }),
        ]),
      );
    }
  });

  it("preserves unknown additive fields at every client-info object level", () => {
    const payload = {
      ...clientInfoFixture,
      accounts: [
        {
          ...clientInfoFixture.accounts[0],
          displayName: "Everyday",
        },
      ],
      jars: [
        {
          ...clientInfoFixture.jars[0],
          progressColor: "green",
        },
      ],
      managedClients: [
        {
          ...clientInfoFixture.managedClients[0],
          accounts: [
            {
              ...clientInfoFixture.managedClients[0].accounts[0],
              displayName: "FOP account",
            },
          ],
          delegationStatus: "active",
        },
      ],
      profileLocale: "uk-UA",
    } as const;

    expect(clientInfoSchema.parse(payload)).toEqual(payload);
  });
});
