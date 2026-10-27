import {
  AcquiringPosCancellationStatus,
  acquiringPosCancellationStatusSchema,
  acquiringStatementAllocationSchema,
  FiscalizationSource,
  installmentsQrCartSchema,
  MonobankAcquiringClient,
  MonobankInstallmentsClient,
  MonobankPersonalClient,
  MonobankPublicClient,
  SigningDocumentHashType,
  verifyAcquiringWebhookSignature,
} from "@liaugust/monobank-sdk";

const browserFetch = async (...args) => await fetch(...args);

const publicApi = new MonobankPublicClient({ fetch: browserFetch });
const client = new MonobankPersonalClient({
  fetch: browserFetch,
  token: "browser-token",
});
const acquiringClient = new MonobankAcquiringClient({
  fetch: browserFetch,
  token: "browser-acquiring-token",
});

void publicApi.bank;
void publicApi.currency;
void client.client;
void client.statements;
void client.webhooks;
void acquiringClient.invoices;
void acquiringClient.merchant;
void acquiringClient.employees;
void acquiringClient.qr;
void acquiringClient.wallet;
void acquiringClient.statements;
void acquiringClient.submerchants;
void acquiringClient.webhooks;
void SigningDocumentHashType.Dstu256;
void verifyAcquiringWebhookSignature;

const installments = new MonobankInstallmentsClient({
  fetch: browserFetch,
  storeId: "synthetic-store",
  storeSecret: "synthetic-secret",
});
void installments.qr.createCart;
void installments.qr.cancelCart;
void acquiringClient.pos.getCancellationStatus;
void AcquiringPosCancellationStatus.Success;
void FiscalizationSource.Vchasnokasa;
void acquiringPosCancellationStatusSchema;
void acquiringStatementAllocationSchema;
void installmentsQrCartSchema;
