const assert = require("node:assert/strict");

const {
  MonobankAcquiringClient,
  MonobankInstallmentsClient,
  AcquiringPosCancellationStatus,
  FiscalizationSource,
  acquiringPosCancellationStatusSchema,
  acquiringStatementAllocationSchema,
  installmentsQrCartSchema,
  MonobankApiError,
  MonobankNetworkError,
  MonobankPersonalClient,
  MonobankPublicClient,
  MonobankResponseValidationError,
  MonobankValidationError,
  SigningDocumentHashType,
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
assert.equal(SigningDocumentHashType.Dstu256, "Dstu256");
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

const installmentsClient = new MonobankInstallmentsClient({
  fetch: fetchStub,
  storeId: "synthetic-store",
  storeSecret: "synthetic-secret",
});
assert.equal(typeof installmentsClient.qr.createCart, "function");
assert.equal(typeof installmentsClient.qr.cancelCart, "function");
assert.equal(typeof acquiringClient.pos.getCancellationStatus, "function");
assert.equal(AcquiringPosCancellationStatus.Success, "success");
assert.equal(FiscalizationSource.Vchasnokasa, "vchasnokasa");
assert.deepEqual(acquiringPosCancellationStatusSchema.parse({}), {});
assert.deepEqual(installmentsQrCartSchema.parse({}), {});
assert.deepEqual(
  acquiringStatementAllocationSchema.parse({
    splitReceiverId: "receiver-42",
    amount: 100,
    profit: 90,
  }),
  { splitReceiverId: "receiver-42", amount: 100, profit: 90 },
);
