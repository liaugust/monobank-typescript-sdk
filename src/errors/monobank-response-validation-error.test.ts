import { describe, expect, it } from "vitest";

import { MonobankResponseValidationError } from "./monobank-response-validation-error.js";

describe("MonobankResponseValidationError", () => {
  it("exposes response validation issues without retaining the raw response", () => {
    const error = new MonobankResponseValidationError({
      endpoint: "/personal/client-info",
      issues: [
        {
          code: "invalid_type",
          message: "Expected string",
          path: ["accounts", 0, "id"],
        },
      ],
      message: "Invalid response payload",
    });

    expect(error).toMatchObject({
      endpoint: "/personal/client-info",
      issues: [
        {
          code: "invalid_type",
          message: "Expected string",
          path: ["accounts", 0, "id"],
        },
      ],
      name: "MonobankResponseValidationError",
    });
    expect(JSON.stringify(error)).not.toContain("rawAccountPayload");
  });
});
