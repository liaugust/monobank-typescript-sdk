import { describe, expect, it } from "vitest";

import * as sdk from "./index.js";

describe("public package surface", () => {
  it("exports only the deliberate runtime API", () => {
    expect(Object.keys(sdk).sort()).toStrictEqual([
      "AccountType",
      "CashbackType",
      "MonobankAcquiringClient",
      "MonobankApiError",
      "MonobankNetworkError",
      "MonobankPersonalClient",
      "MonobankResponseValidationError",
      "MonobankValidationError",
      "accountSchema",
      "bankSyncSchema",
      "clientInfoSchema",
      "currencyRateSchema",
      "currencyRatesSchema",
      "jarSchema",
      "managedAccountSchema",
      "managedClientSchema",
      "merchantDetailsSchema",
      "parsePersonalWebhookEvent",
      "personalWebhookEventSchema",
      "statementItemSchema",
      "statementItemsSchema",
    ]);
  });
});
