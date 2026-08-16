import { describe, expect, it } from "vitest";

import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import { createAcquiringStatementsEndpoint } from "./get-acquiring-statements.js";

describe("Acquiring statement request", () => {
  it("omits optional query parameters and normalizes Date inputs", () => {
    expect(
      createAcquiringStatementsEndpoint({
        from: new Date("2026-08-16T00:00:00.999Z"),
      }),
    ).toBe("/api/merchant/statement?from=1786838400");
  });

  it.each([
    { from: -1, name: "negative Unix time" },
    { from: new Date(-1), name: "pre-epoch Date" },
    { from: 1.5, name: "fractional Unix time" },
    { from: Number.POSITIVE_INFINITY, name: "infinite Unix time" },
    { from: new Date("invalid"), name: "invalid Date" },
  ])("rejects $name before Fetch", ({ from }) => {
    expect(() => createAcquiringStatementsEndpoint({ from })).toThrow(
      MonobankValidationError,
    );
  });

  it("rejects a reversed time window before Fetch", () => {
    expect(() =>
      createAcquiringStatementsEndpoint({ from: 200, to: 199 }),
    ).toThrow(
      expect.objectContaining({
        endpoint: "/api/merchant/statement",
        issues: ["from must be less than or equal to to"],
      }),
    );
  });

  it.each(["", " terminal-42", "terminal-42 "])(
    "rejects invalid terminal code %j before Fetch",
    (code) => {
      expect(() =>
        createAcquiringStatementsEndpoint({ code, from: 100 }),
      ).toThrow(MonobankValidationError);
    },
  );
});
