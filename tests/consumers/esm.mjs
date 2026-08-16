import assert from "node:assert/strict";

import * as sdk from "../../dist/index.js";

const fetchStub = async () => new Response("{}", { status: 200 });
const publicApi = new sdk.MonobankPublicClient({ fetch: fetchStub });
const client = new sdk.MonobankPersonalClient({
  fetch: fetchStub,
  token: "test-token",
});
const acquiringClient = new sdk.MonobankAcquiringClient({
  fetch: fetchStub,
  token: "test-acquiring-token",
});

for (const exportName of [
  "MonobankAcquiringClient",
  "MonobankApiError",
  "MonobankNetworkError",
  "MonobankPersonalClient",
  "MonobankPublicClient",
  "MonobankResponseValidationError",
  "MonobankValidationError",
  "verifyAcquiringWebhookSignature",
]) {
  assert.equal(typeof sdk[exportName], "function");
}

assert.ok(client instanceof sdk.MonobankPersonalClient);
assert.ok(publicApi instanceof sdk.MonobankPublicClient);
assert.ok(acquiringClient instanceof sdk.MonobankAcquiringClient);
assert.equal(sdk.MonobankAcquiringInvoices, undefined);
assert.equal(sdk.MonobankAcquiringMerchant, undefined);
assert.equal(sdk.MonobankAcquiringQr, undefined);
assert.equal(sdk.AcquiringQrAmountType.Merchant, "merchant");
assert.equal(typeof publicApi.bank.getSync, "function");
assert.equal(typeof publicApi.currency.getRates, "function");
assert.equal(typeof client.client.getInfo, "function");
assert.equal(typeof client.statements.get, "function");
assert.equal(typeof client.webhooks.set, "function");
assert.equal(typeof acquiringClient.merchant.getDetails, "function");
assert.equal(typeof acquiringClient.invoices.create, "function");
assert.equal(typeof acquiringClient.qr.list, "function");
assert.equal(typeof acquiringClient.qr.getDetails, "function");
assert.equal(typeof acquiringClient.statements.get, "function");
assert.equal(typeof acquiringClient.submerchants.list, "function");
assert.equal(typeof acquiringClient.webhooks.getPublicKey, "function");
