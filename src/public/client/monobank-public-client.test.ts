import { describe, expect, it } from "vitest";

import { MonobankValidationError } from "../../errors/monobank-validation-error.js";
import { MonobankPublicClient } from "./monobank-public-client.js";

describe("MonobankPublicClient", () => {
  it("validates shared transport configuration at construction", () => {
    expect(
      () => new MonobankPublicClient({ baseUrl: "relative-api-path" }),
    ).toThrow(MonobankValidationError);
  });
});
