import { afterEach, describe, expect, it, vi } from "vitest";

import {
  bankSyncFixture,
  clientInfoFixture,
  currencyRateFixture,
} from "../../tests/fixtures/personal-api.js";
import {
  createFetchSequence,
  jsonResponse,
} from "../../tests/support/create-fetch-sequence.js";
import { MonobankResponseValidationError } from "../errors/monobank-response-validation-error.js";
import { MonobankPersonalClient } from "./monobank-personal-client.js";

function textResponse(body: string, init: ResponseInit = {}): Response {
  return new Response(body, init);
}

function firstRequestHeaders(
  fetch: ReturnType<typeof createFetchSequence>,
): Headers {
  return new Headers(fetch.mock.calls[0]?.[1]?.headers);
}

function firstRequestUrl(fetch: ReturnType<typeof createFetchSequence>): URL {
  const [input] = fetch.mock.calls[0] ?? [];
  expect(input).toBeInstanceOf(URL);
  if (!(input instanceof URL)) {
    throw new Error("Client should call Fetch with a URL instance");
  }

  return input;
}

describe("MonobankPersonalClient public endpoints", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads public currency rates without X-Token", async () => {
    const fetch = createFetchSequence([jsonResponse([currencyRateFixture])]);
    const client = new MonobankPersonalClient({
      fetch,
      token: "personal-token",
    });

    await expect(client.getCurrencyRates()).resolves.toEqual([
      currencyRateFixture,
    ]);
    expect(fetch).toHaveBeenCalledWith(
      new URL("https://api.monobank.ua/bank/currency"),
      expect.objectContaining({ method: "GET" }),
    );
    expect(firstRequestHeaders(fetch).has("X-Token")).toBe(false);
  });

  it("loads public bank sync metadata without X-Token", async () => {
    const fetch = createFetchSequence([jsonResponse(bankSyncFixture)]);
    const client = new MonobankPersonalClient({
      fetch,
      token: "personal-token",
    });

    await expect(client.getBankSync()).resolves.toEqual(bankSyncFixture);
    expect(fetch).toHaveBeenCalledWith(
      new URL("https://api.monobank.ua/bank/sync"),
      expect.objectContaining({ method: "GET" }),
    );
    expect(firstRequestHeaders(fetch).has("X-Token")).toBe(false);
  });

  it("uses custom base URLs for public endpoints without adding credentials", async () => {
    const fetch = createFetchSequence([jsonResponse([currencyRateFixture])]);
    const client = new MonobankPersonalClient({
      baseUrl: "https://gateway.example.test/mono/",
      fetch,
      token: "personal-token",
    });

    await client.getCurrencyRates();

    expect(firstRequestUrl(fetch).href).toBe(
      "https://gateway.example.test/bank/currency",
    );
    expect(firstRequestHeaders(fetch).has("X-Token")).toBe(false);
  });

  it("passes caller signals to public endpoint requests", async () => {
    const fetch = createFetchSequence([jsonResponse(bankSyncFixture)]);
    const client = new MonobankPersonalClient({
      fetch,
      token: "personal-token",
    });
    const controller = new AbortController();

    await client.getBankSync({ signal: controller.signal });

    expect(fetch.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("passes caller signals to public currency requests", async () => {
    const fetch = createFetchSequence([jsonResponse([currencyRateFixture])]);
    const client = new MonobankPersonalClient({
      fetch,
      token: "personal-token",
    });
    const controller = new AbortController();

    await client.getCurrencyRates({ signal: controller.signal });

    expect(fetch.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("turns malformed public payloads into safe response validation errors", async () => {
    const fetch = createFetchSequence([
      textResponse("{not-json", { status: 200 }),
    ]);
    const client = new MonobankPersonalClient({
      fetch,
      token: "personal-token",
    });

    await expect(client.getCurrencyRates()).rejects.toMatchObject({
      endpoint: "/bank/currency",
      name: "MonobankResponseValidationError",
    });
  });

  it("uses configured safe retries for public GET endpoints", async () => {
    vi.useFakeTimers();
    const fetch = createFetchSequence([
      new Response(null, { status: 503 }),
      jsonResponse(bankSyncFixture),
    ]);
    const client = new MonobankPersonalClient({
      fetch,
      retry: { baseDelayMs: 100, maxAttempts: 2, maxDelayMs: 200 },
      token: "personal-token",
    });

    const result = client.getBankSync();
    result.catch(() => undefined);
    await vi.advanceTimersByTimeAsync(99);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);

    await expect(result).resolves.toEqual(bankSyncFixture);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(
      fetch.mock.calls.every(
        ([, init]) => !new Headers(init?.headers).has("X-Token"),
      ),
    ).toBe(true);
  });

  it("does not retry public GET endpoints unless retry is configured", async () => {
    const fetch = createFetchSequence([new Response(null, { status: 503 })]);
    const client = new MonobankPersonalClient({
      fetch,
      token: "personal-token",
    });

    await expect(client.getBankSync()).rejects.toMatchObject({ status: 503 });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("validates successful public payloads with endpoint-specific schemas", async () => {
    const missingRates = {
      currencyCodeA: currencyRateFixture.currencyCodeA,
      currencyCodeB: currencyRateFixture.currencyCodeB,
      date: currencyRateFixture.date,
    };
    const fetch = createFetchSequence([jsonResponse([missingRates])]);
    const client = new MonobankPersonalClient({
      fetch,
      token: "personal-token",
    });

    await expect(client.getCurrencyRates()).rejects.toBeInstanceOf(
      MonobankResponseValidationError,
    );
  });
});

describe("MonobankPersonalClient authenticated client information", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("gets client info with X-Token and validates nested data", async () => {
    const fetch = createFetchSequence([jsonResponse(clientInfoFixture)]);
    const client = new MonobankPersonalClient({
      fetch,
      token: "personal-token",
    });

    await expect(client.getClientInfo()).resolves.toEqual(clientInfoFixture);
    expect(fetch).toHaveBeenCalledWith(
      new URL("https://api.monobank.ua/personal/client-info"),
      expect.objectContaining({ method: "GET" }),
    );
    expect(firstRequestHeaders(fetch).get("X-Token")).toBe("personal-token");
  });

  it("passes caller signals to authenticated client-info requests", async () => {
    const fetch = createFetchSequence([jsonResponse(clientInfoFixture)]);
    const client = new MonobankPersonalClient({
      fetch,
      token: "personal-token",
    });
    const controller = new AbortController();

    await client.getClientInfo({ signal: controller.signal });

    expect(fetch.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("turns malformed nested client-info payloads into safe response validation errors", async () => {
    const fetch = createFetchSequence([
      jsonResponse({
        ...clientInfoFixture,
        accounts: [
          {
            ...clientInfoFixture.accounts[0],
            balance: "10000000",
          },
        ],
      }),
    ]);
    const client = new MonobankPersonalClient({
      fetch,
      token: "personal-token",
    });

    await expect(client.getClientInfo()).rejects.toMatchObject({
      endpoint: "/personal/client-info",
      name: "MonobankResponseValidationError",
    });
  });

  it("surfaces upstream client-info failures without leaking the token", async () => {
    const fetch = createFetchSequence([
      textResponse("personal-token denied", { status: 403 }),
    ]);
    const client = new MonobankPersonalClient({
      fetch,
      token: "personal-token",
    });

    await expect(client.getClientInfo()).rejects.toMatchObject({
      endpoint: "/personal/client-info",
      status: 403,
      upstreamMessage: "[redacted] denied",
    });
  });

  it("uses configured safe retries for authenticated client-info GET requests", async () => {
    vi.useFakeTimers();
    const fetch = createFetchSequence([
      new Response(null, { status: 503 }),
      jsonResponse(clientInfoFixture),
    ]);
    const client = new MonobankPersonalClient({
      fetch,
      retry: { baseDelayMs: 100, maxAttempts: 2, maxDelayMs: 200 },
      token: "personal-token",
    });

    const result = client.getClientInfo();
    result.catch(() => undefined);
    await vi.advanceTimersByTimeAsync(99);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);

    await expect(result).resolves.toEqual(clientInfoFixture);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(
      fetch.mock.calls.every(
        ([, init]) =>
          new Headers(init?.headers).get("X-Token") === "personal-token",
      ),
    ).toBe(true);
  });

  it("does not retry authenticated client-info GET unless retry is configured", async () => {
    const fetch = createFetchSequence([new Response(null, { status: 503 })]);
    const client = new MonobankPersonalClient({
      fetch,
      token: "personal-token",
    });

    await expect(client.getClientInfo()).rejects.toMatchObject({ status: 503 });
    expect(fetch).toHaveBeenCalledOnce();
  });
});
