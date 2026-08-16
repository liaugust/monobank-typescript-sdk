import { afterEach, describe, expect, it, vi } from "vitest";

import { merchantDetailsFixture } from "../../tests/fixtures/acquiring-api.js";
import {
  createFetchSequence,
  jsonResponse,
} from "../../tests/support/create-fetch-sequence.js";
import {
  firstRequestHeaders,
  firstRequestUrl,
} from "../../tests/support/fetch-request-inspection.js";
import { MonobankResponseValidationError } from "../errors/monobank-response-validation-error.js";
import { MonobankValidationError } from "../errors/monobank-validation-error.js";
import { MonobankAcquiringClient } from "./monobank-acquiring-client.js";

describe("MonobankAcquiringClient merchant details", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads merchant details with X-Token", async () => {
    const fetch = createFetchSequence([jsonResponse(merchantDetailsFixture)]);
    const client = new MonobankAcquiringClient({
      fetch,
      token: "acquiring-token",
    });

    await expect(client.getMerchantDetails()).resolves.toEqual(
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

    await client.getMerchantDetails({ signal: controller.signal });

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

    await expect(client.getMerchantDetails()).rejects.toBeInstanceOf(
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

    await expect(client.getMerchantDetails()).rejects.toMatchObject({
      endpoint: "/api/merchant/details",
      status: 403,
      upstreamMessage: "[redacted] denied",
    });
  });

  it("uses the configured safe retry policy", async () => {
    vi.useFakeTimers();
    const fetch = createFetchSequence([
      new Response(null, { status: 503 }),
      jsonResponse(merchantDetailsFixture),
    ]);
    const client = new MonobankAcquiringClient({
      fetch,
      retry: { baseDelayMs: 100, maxAttempts: 2, maxDelayMs: 200 },
      token: "acquiring-token",
    });

    const result = client.getMerchantDetails();
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
