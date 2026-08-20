import { afterEach, describe, expect, it, vi } from "vitest";

import { merchantDetailsFixture } from "../../../tests/fixtures/acquiring/merchant.js";
import { acquiringStatementFixture } from "../../../tests/fixtures/acquiring/statements.js";
import { acquiringWebhookPublicKeyFixture } from "../../../tests/fixtures/acquiring/webhooks.js";
import { createAbortableFetch } from "../../../tests/support/create-abortable-fetch.js";
import {
  createFetchSequence,
  jsonResponse,
} from "../../../tests/support/create-fetch-sequence.js";
import {
  firstRequestHeaders,
  firstRequestUrl,
} from "../../../tests/support/fetch-request-inspection.js";
import { MonobankResponseValidationError } from "../../errors/monobank-response-validation-error.js";
import { MonobankValidationError } from "../../errors/monobank-validation-error.js";
import { MonobankAcquiringClient } from "./monobank-acquiring-client.js";

describe("MonobankAcquiringClient merchant details", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("loads merchant details with X-Token", async () => {
    const fetch = createFetchSequence([jsonResponse(merchantDetailsFixture)]);
    const client = new MonobankAcquiringClient({
      fetch,
      token: "acquiring-token",
    });

    await expect(client.merchant.getDetails()).resolves.toEqual(
      merchantDetailsFixture,
    );
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/api/merchant/details",
    );
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("GET");
    expect(firstRequestHeaders(fetch).get("X-Token")).toBe("acquiring-token");
  });

  it("uses a custom API origin and passes caller cancellation", async () => {
    const fetch = createFetchSequence([jsonResponse(merchantDetailsFixture)]);
    const client = new MonobankAcquiringClient({
      baseUrl: "https://gateway.example.test/mono/",
      fetch,
      token: "acquiring-token",
    });
    const controller = new AbortController();

    await client.merchant.getDetails({ signal: controller.signal });

    expect(firstRequestUrl(fetch).href).toBe(
      "https://gateway.example.test/api/merchant/details",
    );
    expect(fetch.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("rejects malformed merchant details responses", async () => {
    const fetch = createFetchSequence([
      jsonResponse({ ...merchantDetailsFixture, edrpou: 4_242_424_242 }),
    ]);
    const client = new MonobankAcquiringClient({
      fetch,
      token: "acquiring-token",
    });

    await expect(client.merchant.getDetails()).rejects.toBeInstanceOf(
      MonobankResponseValidationError,
    );
  });

  it("redacts the Acquiring token from upstream errors", async () => {
    const fetch = createFetchSequence([
      new Response("acquiring-token denied", { status: 403 }),
    ]);
    const client = new MonobankAcquiringClient({
      fetch,
      token: "acquiring-token",
    });

    await expect(client.merchant.getDetails()).rejects.toMatchObject({
      endpoint: "/api/merchant/details",
      status: 403,
      upstreamMessage: "[redacted] denied",
    });
  });

  it("uses the configured safe retry policy", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(1);
    const fetch = createFetchSequence([
      new Response(null, { status: 503 }),
      jsonResponse(merchantDetailsFixture),
    ]);
    const client = new MonobankAcquiringClient({
      fetch,
      retry: { baseDelayMs: 100, maxAttempts: 2, maxDelayMs: 200 },
      token: "acquiring-token",
    });

    const result = client.merchant.getDetails();
    result.catch(() => undefined);
    await vi.advanceTimersByTimeAsync(99);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);

    await expect(result).resolves.toEqual(merchantDetailsFixture);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("validates Acquiring transport configuration before Fetch", () => {
    const fetch = createFetchSequence([jsonResponse(merchantDetailsFixture)]);

    expect(
      () =>
        new MonobankAcquiringClient({
          fetch,
          token: " acquiring-token ",
        }),
    ).toThrow(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("MonobankAcquiringClient resources", () => {
  it("rejects a cleartext base URL because the token would travel in the clear", () => {
    expect(
      () =>
        new MonobankAcquiringClient({
          baseUrl: "http://api.example.test",
          token: "acquiring-token",
        }),
    ).toThrow(MonobankValidationError);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("exposes webhook trust operations through a dedicated resource", () => {
    const client = new MonobankAcquiringClient({
      fetch: createFetchSequence([]),
      token: "acquiring-token",
    });

    expect(client).toHaveProperty("webhooks");
    expect(typeof client.webhooks.getPublicKey).toBe("function");
  });

  it("loads Acquiring statements through a dedicated authenticated resource", async () => {
    const fetch = createFetchSequence([
      jsonResponse(acquiringStatementFixture),
    ]);
    const client = new MonobankAcquiringClient({
      fetch,
      token: "acquiring-token",
    });

    await expect(
      client.statements.get({
        code: "terminal / 42",
        from: new Date("2026-08-16T00:00:00Z"),
        to: 1_786_924_800,
      }),
    ).resolves.toEqual(acquiringStatementFixture);
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/api/merchant/statement?from=1786838400&to=1786924800&code=terminal+%2F+42",
    );
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("GET");
    expect(firstRequestHeaders(fetch).get("X-Token")).toBe("acquiring-token");
  });

  it("loads the webhook public key through the authenticated resource", async () => {
    const fetch = createFetchSequence([
      jsonResponse(acquiringWebhookPublicKeyFixture),
    ]);
    const client = new MonobankAcquiringClient({
      fetch,
      token: "acquiring-token",
    });

    await expect(client.webhooks.getPublicKey()).resolves.toEqual(
      acquiringWebhookPublicKeyFixture,
    );
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/api/merchant/pubkey",
    );
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("GET");
    expect(firstRequestHeaders(fetch).get("X-Token")).toBe("acquiring-token");
  });

  it("rejects malformed webhook public-key responses", async () => {
    const fetch = createFetchSequence([jsonResponse({ key: 42 })]);
    const client = new MonobankAcquiringClient({
      fetch,
      token: "acquiring-token",
    });

    await expect(client.webhooks.getPublicKey()).rejects.toBeInstanceOf(
      MonobankResponseValidationError,
    );
  });

  it("passes caller cancellation to webhook public-key requests", async () => {
    const { entered, fetch, requestSignal } = createAbortableFetch();
    const client = new MonobankAcquiringClient({
      fetch,
      token: "acquiring-token",
    });
    const controller = new AbortController();

    const request = client.webhooks.getPublicKey({ signal: controller.signal });
    request.catch(() => undefined);
    await entered;
    controller.abort();

    expect(requestSignal()?.aborted).toBe(true);
    await expect(request).rejects.toMatchObject({ reason: "aborted" });
  });

  it("retries webhook public-key requests with the configured safe policy", async () => {
    vi.useFakeTimers();
    const fetch = createFetchSequence([
      new Response(null, { status: 503 }),
      jsonResponse(acquiringWebhookPublicKeyFixture),
    ]);
    const client = new MonobankAcquiringClient({
      fetch,
      retry: { baseDelayMs: 100, maxAttempts: 2, maxDelayMs: 200 },
      token: "acquiring-token",
    });

    const result = client.webhooks.getPublicKey();
    result.catch(() => undefined);
    await vi.advanceTimersByTimeAsync(100);

    await expect(result).resolves.toEqual(acquiringWebhookPublicKeyFixture);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
