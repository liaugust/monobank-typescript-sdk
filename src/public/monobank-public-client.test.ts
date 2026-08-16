import { afterEach, describe, expect, it, vi } from "vitest";

import {
  bankSyncFixture,
  currencyRateFixture,
} from "../../tests/fixtures/personal-api.js";
import {
  createFetchSequence,
  jsonResponse,
} from "../../tests/support/create-fetch-sequence.js";
import {
  firstRequestHeaders,
  firstRequestUrl,
} from "../../tests/support/fetch-request-inspection.js";
import { MonobankResponseValidationError } from "../errors/monobank-response-validation-error.js";
import { MonobankPersonalClient } from "../personal/monobank-personal-client.js";
import { MonobankPublicClient } from "./monobank-public-client.js";

function textResponse(body: string, init: ResponseInit = {}): Response {
  return new Response(body, init);
}

describe("MonobankPublicClient", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads public currency rates without a token", async () => {
    const fetch = createFetchSequence([jsonResponse([currencyRateFixture])]);
    const client = new MonobankPublicClient({ fetch });

    await expect(client.getCurrencyRates()).resolves.toEqual([
      currencyRateFixture,
    ]);
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/bank/currency",
    );
    expect(firstRequestHeaders(fetch).has("X-Token")).toBe(false);
  });

  it("keeps public methods off the Personal client", () => {
    const client = new MonobankPersonalClient({ token: "personal-token" });

    expect("getCurrencyRates" in client).toBe(false);
    expect("getBankSync" in client).toBe(false);
  });

  it("loads public bank sync metadata without a token", async () => {
    const fetch = createFetchSequence([jsonResponse(bankSyncFixture)]);
    const client = new MonobankPublicClient({ fetch });

    await expect(client.getBankSync()).resolves.toEqual(bankSyncFixture);
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/bank/sync",
    );
    expect(firstRequestHeaders(fetch).has("X-Token")).toBe(false);
  });

  it("uses custom base URLs without adding credentials", async () => {
    const fetch = createFetchSequence([jsonResponse([currencyRateFixture])]);
    const client = new MonobankPublicClient({
      baseUrl: "https://gateway.example.test/mono/",
      fetch,
    });

    await client.getCurrencyRates();

    expect(firstRequestUrl(fetch).href).toBe(
      "https://gateway.example.test/bank/currency",
    );
    expect(firstRequestHeaders(fetch).has("X-Token")).toBe(false);
  });

  it("passes caller signals to public requests", async () => {
    const fetch = createFetchSequence([jsonResponse(bankSyncFixture)]);
    const client = new MonobankPublicClient({ fetch });
    const controller = new AbortController();

    await client.getBankSync({ signal: controller.signal });

    expect(fetch.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("uses configured safe retries for public GET requests", async () => {
    vi.useFakeTimers();
    const fetch = createFetchSequence([
      new Response(null, { status: 503 }),
      jsonResponse(bankSyncFixture),
    ]);
    const client = new MonobankPublicClient({
      fetch,
      retry: { baseDelayMs: 100, maxAttempts: 2, maxDelayMs: 200 },
    });

    const result = client.getBankSync();
    result.catch(() => undefined);
    await vi.advanceTimersByTimeAsync(100);

    await expect(result).resolves.toEqual(bankSyncFixture);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(
      fetch.mock.calls.every(
        ([, init]) => !new Headers(init?.headers).has("X-Token"),
      ),
    ).toBe(true);
  });

  it("does not retry public GET requests unless configured", async () => {
    const fetch = createFetchSequence([new Response(null, { status: 503 })]);
    const client = new MonobankPublicClient({ fetch });

    await expect(client.getBankSync()).rejects.toMatchObject({ status: 503 });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("turns malformed successful payloads into validation errors", async () => {
    const fetch = createFetchSequence([
      textResponse("{not-json", { status: 200 }),
    ]);
    const client = new MonobankPublicClient({ fetch });

    await expect(client.getCurrencyRates()).rejects.toBeInstanceOf(
      MonobankResponseValidationError,
    );
  });
});
