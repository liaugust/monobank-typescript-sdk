import {
  MonobankAcquiringClient,
  MonobankPersonalClient,
  MonobankPublicClient,
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
void acquiringClient.qr;
void acquiringClient.statements;
void acquiringClient.submerchants;
void acquiringClient.webhooks;
void verifyAcquiringWebhookSignature;
