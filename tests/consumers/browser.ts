import { MonobankPersonalClient } from "@liaugust/monobank-sdk";

const browserFetch: typeof fetch = async (...args) => await fetch(...args);

const client = new MonobankPersonalClient({
  fetch: browserFetch,
  token: "browser-token",
});

void client;
