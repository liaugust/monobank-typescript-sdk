import { describe, expect, it } from "vitest";

import { MonobankApiError } from "./monobank-api-error.js";

describe("MonobankApiError", () => {
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
});
