import { describe, expect, it } from "vitest";

import { MonobankNetworkError } from "./monobank-network-error.js";

describe("MonobankNetworkError", () => {
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
});
