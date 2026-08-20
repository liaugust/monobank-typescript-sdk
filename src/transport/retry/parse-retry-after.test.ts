import { describe, expect, it } from "vitest";

import { parseRetryAfter } from "./parse-retry-after.js";

describe("parseRetryAfter", () => {
  it.each([
    ["60", Date.UTC(2026, 7, 16), 60_000],
    ["Sun, 16 Aug 2026 12:01:00 GMT", Date.UTC(2026, 7, 16, 12), 60_000],
    ["invalid", Date.UTC(2026, 7, 16), undefined],
    [null, Date.UTC(2026, 7, 16), undefined],
    ["", Date.UTC(2026, 7, 16), undefined],
    ["   ", Date.UTC(2026, 7, 16), undefined],
    ["-1", Date.UTC(2026, 7, 16), 0],
    ["1e10", Date.UTC(2026, 7, 16), 10_000_000_000_000],
  ])("parses Retry-After %s", (value, nowMs, expected) => {
    expect(parseRetryAfter(value, nowMs)).toBe(expected);
  });

  it("clamps past HTTP dates to zero", () => {
    expect(
      parseRetryAfter(
        "Sun, 16 Aug 2026 11:59:00 GMT",
        Date.UTC(2026, 7, 16, 12),
      ),
    ).toBe(0);
  });
});
