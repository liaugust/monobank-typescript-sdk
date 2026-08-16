import {
  MonobankAcquiringClient,
  MonobankPersonalClient,
} from "@liaugust/monobank-sdk";

const browserFetch: typeof fetch = async (...args) => await fetch(...args);

const client = new MonobankPersonalClient({
  fetch: browserFetch,
  token: "browser-token",
});
const acquiringClient = new MonobankAcquiringClient({
  fetch: browserFetch,
  token: "browser-acquiring-token",
});

void client;
void acquiringClient;
