import { afterEach, describe, expect, it, vi } from "vitest";

import {
  acquiringCardPaymentFixture,
  acquiringWalletFixture,
} from "../../../tests/fixtures/acquiring/wallet.js";
import { expectCallerCancellation } from "../../../tests/support/acquiring-cancellation.js";
import {
  createFetchSequence,
  jsonResponse,
} from "../../../tests/support/create-fetch-sequence.js";
import {
  firstRequestBody,
  firstRequestHeaders,
  firstRequestUrl,
} from "../../../tests/support/fetch-request-inspection.js";
import { MonobankResponseValidationError } from "../../errors/monobank-response-validation-error.js";
import { MonobankValidationError } from "../../errors/monobank-validation-error.js";
import { MonobankAcquiringClient } from "../client/monobank-acquiring-client.js";
import { AcquiringPaymentInitiationKind } from "./pay-with-card-token/pay-with-card-token.js";

function createClient(fetch: ReturnType<typeof createFetchSequence>) {
  return new MonobankAcquiringClient({ fetch, token: "acquiring-token" });
}

const payment = {
  amount: 4_200,
  cardToken: "67XZtXdR4NpKU3",
  ccy: 980,
  initiationKind: AcquiringPaymentInitiationKind.Client,
} as const;

describe("MonobankAcquiringWallet", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists tokenized cards for one wallet", async () => {
    const fetch = createFetchSequence([jsonResponse(acquiringWalletFixture)]);
    const client = createClient(fetch);

    await expect(
      client.wallet.list({ walletId: "wallet-42" }),
    ).resolves.toEqual(acquiringWalletFixture);
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/api/merchant/wallet?walletId=wallet-42",
    );
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("GET");
    expect(firstRequestHeaders(fetch).get("X-Token")).toBe("acquiring-token");
  });

  it("charges a stored card token", async () => {
    const fetch = createFetchSequence([
      jsonResponse(acquiringCardPaymentFixture),
    ]);
    const client = createClient(fetch);

    await expect(client.wallet.pay(payment)).resolves.toEqual(
      acquiringCardPaymentFixture,
    );
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/api/merchant/wallet/payment",
    );
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(firstRequestBody(fetch)).toEqual(payment);
  });

  it("removes a tokenized card with an HTTP DELETE", async () => {
    const fetch = createFetchSequence([jsonResponse({})]);
    const client = createClient(fetch);

    await expect(
      client.wallet.deleteCard({ cardToken: "67XZtXdR4NpKU3" }),
    ).resolves.toBeUndefined();
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/api/merchant/wallet/card?cardToken=67XZtXdR4NpKU3",
    );
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("DELETE");
    expect(firstRequestHeaders(fetch).get("X-Token")).toBe("acquiring-token");
  });

  it.each([
    {
      name: "payment",
      start: (client: MonobankAcquiringClient) => client.wallet.pay(payment),
    },
    {
      name: "card removal",
      start: (client: MonobankAcquiringClient) =>
        client.wallet.deleteCard({ cardToken: "67XZtXdR4NpKU3" }),
    },
  ])("never retries the wallet $name", async ({ start }) => {
    const fetch = createFetchSequence([
      new Response(null, { status: 503 }),
      jsonResponse(acquiringCardPaymentFixture),
    ]);
    const client = new MonobankAcquiringClient({
      fetch,
      retry: { baseDelayMs: 1, maxAttempts: 3, maxDelayMs: 2 },
      token: "acquiring-token",
    });

    await expect(start(client)).rejects.toMatchObject({ status: 503 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries the safe wallet listing", async () => {
    vi.useFakeTimers();
    const fetch = createFetchSequence([
      new Response(null, { status: 503 }),
      jsonResponse(acquiringWalletFixture),
    ]);
    const client = new MonobankAcquiringClient({
      fetch,
      retry: { baseDelayMs: 100, maxAttempts: 2, maxDelayMs: 200 },
      token: "acquiring-token",
    });

    const result = client.wallet.list({ walletId: "wallet-42" });
    result.catch(() => undefined);
    await vi.advanceTimersByTimeAsync(100);

    await expect(result).resolves.toEqual(acquiringWalletFixture);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("rejects malformed wallet responses", async () => {
    const fetch = createFetchSequence([
      jsonResponse({ wallet: [{ cardToken: 42 }] }),
    ]);

    await expect(
      createClient(fetch).wallet.list({ walletId: "wallet-42" }),
    ).rejects.toBeInstanceOf(MonobankResponseValidationError);
  });

  it.each([
    {
      name: "wallet listing",
      start: (client: MonobankAcquiringClient) =>
        client.wallet.list({ walletId: "" }),
    },
    {
      name: "card removal",
      start: (client: MonobankAcquiringClient) =>
        client.wallet.deleteCard({ cardToken: "" }),
    },
    {
      name: "card payment",
      start: (client: MonobankAcquiringClient) =>
        client.wallet.pay({ ...payment, cardToken: "" }),
    },
  ])("rejects invalid $name input before Fetch", async ({ start }) => {
    const fetch = createFetchSequence([]);
    const client = createClient(fetch);

    await expect(start(client)).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "listing",
      start: (client: MonobankAcquiringClient, signal: AbortSignal) =>
        client.wallet.list({ walletId: "wallet-42" }, { signal }),
    },
    {
      name: "payment",
      start: (client: MonobankAcquiringClient, signal: AbortSignal) =>
        client.wallet.pay(payment, { signal }),
    },
    {
      name: "card removal",
      start: (client: MonobankAcquiringClient, signal: AbortSignal) =>
        client.wallet.deleteCard({ cardToken: "67XZtXdR4NpKU3" }, { signal }),
    },
  ])("passes caller cancellation to the wallet $name", async ({ start }) => {
    await expectCallerCancellation(start);
  });
});
