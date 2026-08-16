import { describe, expect, it } from "vitest";

import { acquiringSubmerchantListFixture } from "../../../../tests/fixtures/acquiring/submerchants.js";
import {
  acquiringSubmerchantListSchema,
  acquiringSubmerchantSchema,
} from "./acquiring-submerchant.js";

describe("Acquiring submerchant schemas", () => {
  it("parses complete and minimal documented submerchants", () => {
    expect(
      acquiringSubmerchantListSchema.parse(acquiringSubmerchantListFixture),
    ).toEqual(acquiringSubmerchantListFixture);
    expect(
      acquiringSubmerchantSchema.parse({
        code: "terminal-42",
        iban: "UA213996220000026007233566001",
      }),
    ).toEqual({
      code: "terminal-42",
      iban: "UA213996220000026007233566001",
    });
  });

  it.each([
    { iban: "UA213996220000026007233566001", name: "missing code" },
    { code: "terminal-42", name: "missing IBAN" },
    { code: 42, iban: "UA213996220000026007233566001", name: "numeric code" },
    { code: "terminal-42", iban: 42, name: "numeric IBAN" },
    {
      code: "terminal-42",
      edrpou: 4_242_424_242,
      iban: "UA213996220000026007233566001",
      name: "numeric EDRPOU",
    },
    {
      code: "terminal-42",
      iban: "UA213996220000026007233566001",
      name: "numeric owner",
      owner: 42,
    },
  ])("rejects $name", (value) => {
    expect(acquiringSubmerchantSchema.safeParse(value).success).toBe(false);
  });

  it("preserves additive response fields", () => {
    const payload = {
      requestId: "request-42",
      list: [
        {
          ...acquiringSubmerchantListFixture.list[0],
          status: "active",
        },
      ],
    } as const;

    expect(acquiringSubmerchantListSchema.parse(payload)).toEqual(payload);
  });
});
