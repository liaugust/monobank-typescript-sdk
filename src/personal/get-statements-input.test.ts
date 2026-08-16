import { describe, expect, it } from "vitest";

import { MonobankValidationError } from "../errors/monobank-validation-error.js";
import { createStatementsEndpoint } from "./get-statements-input.js";

describe("get statements input validation", () => {
  it("builds an encoded statement endpoint from Date inputs", () => {
    expect(
      createStatementsEndpoint({
        account: "jar/id",
        from: new Date("2026-08-01T00:00:00.000Z"),
        to: new Date("2026-08-02T00:00:00.000Z"),
      }),
    ).toBe("/personal/statement/jar%2Fid/1785542400/1785628800");
  });

  it("uses account 0 and omits the trailing to segment when both are omitted at runtime", () => {
    expect(
      createStatementsEndpoint({
        from: 1_785_542_400,
      } as Parameters<typeof createStatementsEndpoint>[0]),
    ).toBe("/personal/statement/0/1785542400");
  });

  it("accepts the documented maximum inclusive statement window", () => {
    expect(
      createStatementsEndpoint({
        account: "0",
        from: 1_000,
        to: 2_683_000,
      }),
    ).toBe("/personal/statement/0/1000/2683000");
  });

  it("rejects invalid statement time values before a request can be built", () => {
    expect(() =>
      createStatementsEndpoint({
        account: "0",
        from: new Date(Number.NaN),
      }),
    ).toThrow(MonobankValidationError);
    expect(() => createStatementsEndpoint({ account: "0", from: -1 })).toThrow(
      MonobankValidationError,
    );
    expect(() => createStatementsEndpoint({ account: "0", from: 1.5 })).toThrow(
      MonobankValidationError,
    );
  });

  it("rejects empty accounts, inverted ranges, and over-limit windows", () => {
    expect(() =>
      createStatementsEndpoint({ account: "", from: 1_000 }),
    ).toThrow(MonobankValidationError);
    expect(() =>
      createStatementsEndpoint({ account: "0", from: 2_000, to: 1_999 }),
    ).toThrow(MonobankValidationError);
    expect(() =>
      createStatementsEndpoint({ account: "0", from: 1_000, to: 2_683_001 }),
    ).toThrow(MonobankValidationError);
  });

  it("rejects dot-segment accounts before they can be normalized by URL resolution", () => {
    expect(() =>
      createStatementsEndpoint({ account: ".", from: 1_000 }),
    ).toThrow(MonobankValidationError);
    expect(() =>
      createStatementsEndpoint({ account: "..", from: 1_000 }),
    ).toThrow(MonobankValidationError);
  });
});
