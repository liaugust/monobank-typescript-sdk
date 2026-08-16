const assert = require("node:assert/strict");

const {
  MonobankAcquiringClient,
  MonobankAcquiringInvoices,
  MonobankAcquiringMerchant,
  MonobankApiError,
  MonobankNetworkError,
  MonobankPersonalClient,
  MonobankPublicClient,
  MonobankResponseValidationError,
  MonobankValidationError,
} = require("../../dist/index.cjs");

const fetchStub = async () => new Response("{}", { status: 200 });
const publicApi = new MonobankPublicClient({ fetch: fetchStub });
const client = new MonobankPersonalClient({
  fetch: fetchStub,
  token: "test-token",
});
const acquiringClient = new MonobankAcquiringClient({
  fetch: fetchStub,
  token: "test-acquiring-token",
});

assert.equal(typeof MonobankAcquiringClient, "function");
assert.equal(typeof MonobankAcquiringInvoices, "function");
assert.equal(typeof MonobankAcquiringMerchant, "function");
assert.equal(typeof MonobankApiError, "function");
assert.equal(typeof MonobankNetworkError, "function");
assert.equal(typeof MonobankPersonalClient, "function");
assert.equal(typeof MonobankPublicClient, "function");
assert.equal(typeof MonobankResponseValidationError, "function");
assert.equal(typeof MonobankValidationError, "function");
assert.ok(client instanceof MonobankPersonalClient);
assert.ok(publicApi instanceof MonobankPublicClient);
assert.ok(acquiringClient instanceof MonobankAcquiringClient);
assert.ok(acquiringClient.invoices instanceof MonobankAcquiringInvoices);
assert.ok(acquiringClient.merchant instanceof MonobankAcquiringMerchant);
