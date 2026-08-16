const assert = require("node:assert/strict");

const {
  MonobankAcquiringClient,
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
assert.equal(typeof MonobankApiError, "function");
assert.equal(typeof MonobankNetworkError, "function");
assert.equal(typeof MonobankPersonalClient, "function");
assert.equal(typeof MonobankPublicClient, "function");
assert.equal(typeof MonobankResponseValidationError, "function");
assert.equal(typeof MonobankValidationError, "function");
assert.ok(client instanceof MonobankPersonalClient);
assert.ok(publicApi instanceof MonobankPublicClient);
assert.ok(acquiringClient instanceof MonobankAcquiringClient);
assert.equal(typeof publicApi.bank.getSync, "function");
assert.equal(typeof publicApi.currency.getRates, "function");
assert.equal(typeof client.client.getInfo, "function");
assert.equal(typeof client.statements.get, "function");
assert.equal(typeof client.webhooks.set, "function");
assert.equal(typeof acquiringClient.merchant.getDetails, "function");
assert.equal(typeof acquiringClient.invoices.create, "function");
