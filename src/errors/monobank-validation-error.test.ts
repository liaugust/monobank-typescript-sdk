import { describe, expect, it } from "vitest";

import { MonobankValidationError } from "./monobank-validation-error.js";

describe("MonobankValidationError", () => {
  it("retains only safe validation issue text", () => {
    const error = new MonobankValidationError({
      endpoint: "/personal/statement",
      issues: ["from must be a valid Unix timestamp", "token is required"],
      message: "Invalid SDK input",
    });

    expect(error).toMatchObject({
      endpoint: "/personal/statement",
      issues: ["from must be a valid Unix timestamp", "token is required"],
      name: "MonobankValidationError",
    });
    expect(JSON.stringify(error)).not.toContain("secret-token");
  });

  it("allows validation errors that are not tied to an endpoint", () => {
    const error = new MonobankValidationError({
      issues: ["token is required"],
      message: "Invalid SDK input",
    });

    expect(error.endpoint).toBeUndefined();
  });
});
