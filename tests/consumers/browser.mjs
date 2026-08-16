import {
  MonobankAcquiringClient,
  MonobankPersonalClient,
  MonobankPublicClient,
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

void client;
void publicApi;
void acquiringClient.invoices;
void acquiringClient.merchant;
