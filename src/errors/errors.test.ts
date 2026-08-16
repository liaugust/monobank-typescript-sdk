import { describe, expect, it } from "vitest";

import { MonobankApiError } from "./monobank-api-error.js";
import { MonobankNetworkError } from "./monobank-network-error.js";
import { MonobankResponseValidationError } from "./monobank-response-validation-error.js";
import { MonobankValidationError } from "./monobank-validation-error.js";

describe("public error model", () => {
  it("keeps API metadata without including credentials", () => {
    const error = new MonobankApiError({
      endpoint: "/personal/client-info",
      headers: { "retry-after": "60" },
      message: "Too many requests",
      retryAfterMs: 60_000,
      status: 429,
    });

    expect(error).toMatchObject({
      endpoint: "/personal/client-info",
      name: "MonobankApiError",
      retryAfterMs: 60_000,
      status: 429,
    });
    expect(JSON.stringify(error)).not.toContain("X-Token");
  });

  it("keeps only normalized upstream API diagnostics", () => {
    const error = new MonobankApiError({
      endpoint: "/personal/client-info",
      headers: {
        "content-type": "application/json",
        "x-token": "secret-token",
      },
      message: "Upstream request failed",
      status: 500,
      upstreamMessage: "Temporary upstream failure",
    });

    expect(error).toMatchObject({
      headers: { "content-type": "application/json" },
      upstreamMessage: "Temporary upstream failure",
    });
    expect(error.headers).not.toHaveProperty("x-token");
    expect(error.message).toBe("Upstream request failed");
    expect(JSON.stringify(error)).not.toContain("secret-token");
  });

  it.each(["network", "timeout", "aborted"] as const)(
    "classifies %s network failures",
    (reason) => {
      const cause = new Error("Socket closed");
      const error = new MonobankNetworkError({
        cause,
        endpoint: "/personal/client-info",
        message: "Request failed",
        reason,
      });

      expect(error).toMatchObject({
        endpoint: "/personal/client-info",
        name: "MonobankNetworkError",
        reason,
      });
      expect(error.cause).toBe(cause);
    },
  );

  it("does not invent a network cause when none is supplied", () => {
    const error = new MonobankNetworkError({
      endpoint: "/personal/client-info",
      message: "Request failed",
      reason: "network",
    });

    expect(error.cause).toBeUndefined();
  });

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
