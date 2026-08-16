import { describe, expect, it } from "vitest";

import * as sdk from "./index.js";

describe("public package surface", () => {
  it("exports only the deliberate runtime API", () => {
    expect(Object.keys(sdk).sort()).toStrictEqual([
      "AccountType",
      "CashbackType",
      "DiscountMode",
      "DiscountType",
      "FiscalCheckStatus",
      "FiscalCheckType",
      "FiscalizationSource",
      "InvoiceCancellationStatus",
      "InvoicePaymentMethod",
      "InvoicePaymentSystem",
      "InvoicePaymentType",
      "InvoiceStatus",
      "InvoiceWalletStatus",
      "MonobankAcquiringClient",
      "MonobankAcquiringMerchant",
      "MonobankApiError",
      "MonobankNetworkError",
      "MonobankPersonalClient",
      "MonobankPublicClient",
      "MonobankResponseValidationError",
      "MonobankValidationError",
      "accountSchema",
      "bankSyncSchema",
      "cancelInvoiceResponseSchema",
      "clientInfoSchema",
      "currencyRateSchema",
      "currencyRatesSchema",
      "finalizeInvoiceResponseSchema",
      "invoiceFiscalChecksSchema",
      "invoiceStatusSchema",
      "jarSchema",
      "managedAccountSchema",
      "managedClientSchema",
      "merchantDetailsSchema",
      "newInvoiceSchema",
      "parsePersonalWebhookEvent",
      "personalWebhookEventSchema",
      "receiptSchema",
      "statementItemSchema",
      "statementItemsSchema",
    ]);
  });
});
