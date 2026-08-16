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
  "MonobankAcquiringInvoices",
  "MonobankAcquiringMerchant",
  "MonobankApiError",
  "MonobankNetworkError",
  "MonobankPersonalClient",
  "MonobankPublicClient",
  "MonobankResponseValidationError",
  "MonobankValidationError",
]) {
  assert.equal(typeof sdk[exportName], "function");
}

assert.ok(client instanceof sdk.MonobankPersonalClient);
assert.ok(publicApi instanceof sdk.MonobankPublicClient);
assert.ok(acquiringClient instanceof sdk.MonobankAcquiringClient);
assert.ok(acquiringClient.invoices instanceof sdk.MonobankAcquiringInvoices);
assert.ok(acquiringClient.merchant instanceof sdk.MonobankAcquiringMerchant);
