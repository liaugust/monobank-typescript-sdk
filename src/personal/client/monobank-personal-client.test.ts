import { describe, expect, it } from "vitest";

import { MonobankValidationError } from "../../errors/monobank-validation-error.js";
import { MonobankPersonalClientInfo } from "../client-info/monobank-personal-client-info.js";
import { MonobankPersonalStatements } from "../statements/monobank-personal-statements.js";
import { MonobankPersonalWebhooks } from "../webhooks/monobank-personal-webhooks.js";
import { MonobankPersonalClient } from "./monobank-personal-client.js";

describe("MonobankPersonalClient", () => {
  it("rejects a cleartext base URL because the token would travel in the clear", () => {
    expect(
      () =>
        new MonobankPersonalClient({
          baseUrl: "http://api.example.test",
          token: "personal-token",
        }),
    ).toThrow(MonobankValidationError);
  });

  it("exposes the authenticated Personal API through owned resources", () => {
    const client = new MonobankPersonalClient({ token: "personal-token" });

    expect(client.client).toBeInstanceOf(MonobankPersonalClientInfo);
    expect(client.statements).toBeInstanceOf(MonobankPersonalStatements);
    expect(client.webhooks).toBeInstanceOf(MonobankPersonalWebhooks);
  });
});
