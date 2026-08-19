import { describe, expect, it } from "vitest";

import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import type { AcquiringSubscriptionPageInput } from "./subscription-page-query.js";
import { createAcquiringSubscriptionPageQuery } from "./subscription-page-query.js";

const endpoint = "/api/merchant/subscription/list";

function query(input: AcquiringSubscriptionPageInput): string {
  return createAcquiringSubscriptionPageQuery(input, endpoint).toString();
}

function expectIssues(
  input: AcquiringSubscriptionPageInput,
  issues: readonly string[],
): void {
  try {
    query(input);
    expect.unreachable("expected a validation error");
  } catch (error) {
    expect(error).toBeInstanceOf(MonobankValidationError);
    expect((error as MonobankValidationError).issues).toEqual(issues);
    expect((error as MonobankValidationError).endpoint).toBe(endpoint);
  }
}

describe("createAcquiringSubscriptionPageQuery", () => {
  it("serializes a Date window as RFC-3339 in UTC", () => {
    expect(
      query({
        dateFrom: new Date("2024-06-01T00:00:00Z"),
        dateTo: new Date("2024-06-30T23:59:59Z"),
      }),
    ).toBe(
      "dateFrom=2024-06-01T00%3A00%3A00.000Z&dateTo=2024-06-30T23%3A59%3A59.000Z",
    );
  });

  it("forwards a string window unchanged so an offset survives", () => {
    expect(query({ dateFrom: "2024-06-26T18:12:44+03:00" })).toBe(
      "dateFrom=2024-06-26T18%3A12%3A44%2B03%3A00",
    );
  });

  it("adds paging values only when supplied", () => {
    expect(
      query({ dateFrom: "2024-06-01T00:00:00Z", limit: 50, page: 2 }),
    ).toBe("dateFrom=2024-06-01T00%3A00%3A00Z&limit=50&page=2");
  });

  it("rejects an invalid Date", () => {
    expectIssues({ dateFrom: new Date("not-a-date") }, [
      "dateFrom must be a valid Date",
    ]);
  });

  it("rejects a malformed timestamp string", () => {
    expectIssues({ dateFrom: "yesterday" }, [
      "dateFrom must be an RFC-3339 timestamp or a valid Date",
    ]);
  });

  it("rejects a timestamp string with surrounding whitespace", () => {
    expectIssues({ dateFrom: " 2024-06-01T00:00:00Z " }, [
      "dateFrom must be an RFC-3339 timestamp or a valid Date",
    ]);
  });

  it("rejects an untyped non-string window value", () => {
    expectIssues(
      { dateFrom: 1_717_200_000 } as unknown as AcquiringSubscriptionPageInput,
      ["dateFrom must be an RFC-3339 timestamp or a valid Date"],
    );
  });

  it("reports an invalid dateTo alongside a valid dateFrom", () => {
    expectIssues(
      { dateFrom: "2024-06-01T00:00:00Z", dateTo: new Date("not-a-date") },
      ["dateTo must be a valid Date"],
    );
  });

  it("rejects a reversed window Monobank would answer as empty", () => {
    expectIssues(
      { dateFrom: "2024-06-30T00:00:00Z", dateTo: "2024-06-01T00:00:00Z" },
      ["dateFrom must be earlier than or equal to dateTo"],
    );
  });

  it("accepts a window whose bounds are equal", () => {
    expect(
      query({
        dateFrom: "2024-06-01T00:00:00Z",
        dateTo: "2024-06-01T00:00:00Z",
      }),
    ).toBe("dateFrom=2024-06-01T00%3A00%3A00Z&dateTo=2024-06-01T00%3A00%3A00Z");
  });

  it("rejects a fractional page size", () => {
    expectIssues({ dateFrom: "2024-06-01T00:00:00Z", limit: 1.5 }, [
      "limit must be a positive integer",
    ]);
  });

  it("rejects a zero page index", () => {
    expectIssues({ dateFrom: "2024-06-01T00:00:00Z", page: 0 }, [
      "page must be a positive integer",
    ]);
  });

  it("collects every issue from one request", () => {
    expectIssues({ dateFrom: "nope", limit: -1, page: 0 }, [
      "dateFrom must be an RFC-3339 timestamp or a valid Date",
      "limit must be a positive integer",
      "page must be a positive integer",
    ]);
  });
});
