import { describe, expect, it } from "vitest";

import { corporateSettingsFixture } from "../../../../tests/fixtures/corporate/company.js";
import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import {
  corporateSettingsSchema,
  parseGetCorporateSettingsInput,
} from "./get-settings.js";

describe("corporate settings schema", () => {
  it("accepts complete company settings data", () => {
    expect(corporateSettingsSchema.parse(corporateSettingsFixture)).toEqual(
      corporateSettingsFixture,
    );
  });

  it("accepts settings without the optional webhook", () => {
    const payload = Object.fromEntries(
      Object.entries(corporateSettingsFixture).filter(
        ([key]) => key !== "webhook",
      ),
    );

    expect(corporateSettingsSchema.safeParse(payload).success).toBe(true);
  });

  it("preserves the upstream id field the specification never defines", () => {
    const payload = { ...corporateSettingsFixture, id: "svc-1" } as const;

    expect(corporateSettingsSchema.parse(payload)).toEqual(payload);
  });

  it("rejects malformed required company fields", () => {
    const result = corporateSettingsSchema.safeParse({
      logo: null,
      name: 42,
      permission: false,
      pubkey: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["logo"] }),
          expect.objectContaining({ path: ["name"] }),
          expect.objectContaining({ path: ["permission"] }),
          expect.objectContaining({ path: ["pubkey"] }),
        ]),
      );
    }
  });
});

describe("corporate settings input", () => {
  it("returns the parsed request identifier", () => {
    expect(parseGetCorporateSettingsInput({ requestId: "req-1" })).toEqual({
      requestId: "req-1",
    });
  });

  it.each([
    ["an empty identifier", ""],
    ["a padded identifier", " req-1 "],
    ["an identifier with an interior space", "req 1"],
    ["an identifier with a control character", "req\r\n1"],
  ])("rejects %s before Fetch", (_label, requestId) => {
    expect(() => parseGetCorporateSettingsInput({ requestId })).toThrow(
      MonobankValidationError,
    );
  });
});
