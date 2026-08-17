const assert = require("node:assert/strict");

const {
  MonobankAcquiringClient,
  MonobankApiError,
  MonobankNetworkError,
  MonobankPersonalClient,
  MonobankPublicClient,
  MonobankResponseValidationError,
  MonobankValidationError,
  verifyAcquiringWebhookSignature,
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
assert.equal(typeof verifyAcquiringWebhookSignature, "function");
assert.ok(client instanceof MonobankPersonalClient);
assert.ok(publicApi instanceof MonobankPublicClient);
assert.ok(acquiringClient instanceof MonobankAcquiringClient);

const resourceMethods = [
  publicApi.bank.getSync,
  publicApi.currency.getRates,
  client.client.getInfo,
  client.statements.get,
  client.webhooks.set,
  acquiringClient.merchant.getDetails,
  acquiringClient.invoices.create,
  acquiringClient.employees.list,
  acquiringClient.wallet.list,
  acquiringClient.wallet.pay,
  acquiringClient.wallet.deleteCard,
  acquiringClient.invoices.payDirect,
  acquiringClient.invoices.syncPayment,
  acquiringClient.qr.list,
  acquiringClient.qr.getDetails,
  acquiringClient.qr.resetAmount,
  acquiringClient.statements.get,
  acquiringClient.submerchants.list,
  acquiringClient.webhooks.getPublicKey,
];

for (const method of resourceMethods) {
  assert.equal(typeof method, "function");
}
