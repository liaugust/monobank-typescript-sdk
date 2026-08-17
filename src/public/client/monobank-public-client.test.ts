import { describe, expect, it } from "vitest";

import { MonobankValidationError } from "../../errors/monobank-validation-error.js";
import { MonobankPublicClient } from "./monobank-public-client.js";

describe("MonobankPublicClient", () => {
  it("allows a cleartext base URL because it holds no token", () => {
    expect(
      () => new MonobankPublicClient({ baseUrl: "http://api.example.test" }),
    ).not.toThrow();
  });

  it("validates shared transport configuration at construction", () => {
    expect(
      () => new MonobankPublicClient({ baseUrl: "relative-api-path" }),
    ).toThrow(MonobankValidationError);
  });
});
