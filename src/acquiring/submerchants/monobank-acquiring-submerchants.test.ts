import { afterEach, describe, expect, it, vi } from "vitest";

import { acquiringSubmerchantListFixture } from "../../../tests/fixtures/acquiring/submerchants.js";
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
import { MonobankAcquiringClient } from "../client/monobank-acquiring-client.js";

describe("MonobankAcquiringSubmerchants", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads the authenticated submerchant list", async () => {
    const fetch = createFetchSequence([
      jsonResponse(acquiringSubmerchantListFixture),
    ]);
    const client = new MonobankAcquiringClient({
      fetch,
      token: "acquiring-token",
    });

    await expect(client.submerchants.list()).resolves.toEqual(
      acquiringSubmerchantListFixture,
    );
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/api/merchant/submerchant/list",
    );
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("GET");
    expect(firstRequestHeaders(fetch).get("X-Token")).toBe("acquiring-token");
  });

  it("uses the configured safe retry policy", async () => {
    vi.useFakeTimers();
    const fetch = createFetchSequence([
      new Response(null, { status: 503 }),
      jsonResponse(acquiringSubmerchantListFixture),
    ]);
    const client = new MonobankAcquiringClient({
      fetch,
      retry: { baseDelayMs: 100, maxAttempts: 2, maxDelayMs: 200 },
      token: "acquiring-token",
    });

    const result = client.submerchants.list();
    result.catch(() => undefined);
    await vi.advanceTimersByTimeAsync(100);

    await expect(result).resolves.toEqual(acquiringSubmerchantListFixture);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("rejects malformed successful responses", async () => {
    const fetch = createFetchSequence([
      jsonResponse({
        list: [{ code: 42, iban: "UA213996220000026007233566001" }],
      }),
    ]);
    const client = new MonobankAcquiringClient({
      fetch,
      token: "acquiring-token",
    });

    await expect(client.submerchants.list()).rejects.toBeInstanceOf(
      MonobankResponseValidationError,
    );
  });

  it("passes caller cancellation to the active request", async () => {
    const { fetch, requestSignal } = createAbortableFetch();
    const client = new MonobankAcquiringClient({
      fetch,
      token: "acquiring-token",
    });
    const controller = new AbortController();

    const request = client.submerchants.list({ signal: controller.signal });
    request.catch(() => undefined);
    await Promise.resolve();
    controller.abort();

    expect(requestSignal()?.aborted).toBe(true);
    await expect(request).rejects.toMatchObject({ reason: "aborted" });
  });
});
