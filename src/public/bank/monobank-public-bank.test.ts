import { afterEach, describe, expect, it, vi } from "vitest";

import { bankSyncFixture } from "../../../tests/fixtures/personal-api.js";
import {
  createFetchSequence,
  jsonResponse,
} from "../../../tests/support/create-fetch-sequence.js";
import {
  firstRequestHeaders,
  firstRequestUrl,
} from "../../../tests/support/fetch-request-inspection.js";
import { MonobankPublicClient } from "../client/monobank-public-client.js";

describe("MonobankPublicBank", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads synchronization metadata without a token", async () => {
    const fetch = createFetchSequence([jsonResponse(bankSyncFixture)]);
    const client = new MonobankPublicClient({ fetch });

    await expect(client.bank.getSync()).resolves.toEqual(bankSyncFixture);
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/bank/sync",
    );
    expect(firstRequestHeaders(fetch).has("X-Token")).toBe(false);
  });

  it("passes caller cancellation to synchronization requests", async () => {
    const fetch = createFetchSequence([jsonResponse(bankSyncFixture)]);
    const client = new MonobankPublicClient({ fetch });
    const controller = new AbortController();

    await client.bank.getSync({ signal: controller.signal });

    expect(fetch.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("uses configured retries without adding credentials", async () => {
    vi.useFakeTimers();
    const fetch = createFetchSequence([
      new Response(null, { status: 503 }),
      jsonResponse(bankSyncFixture),
    ]);
    const client = new MonobankPublicClient({
      fetch,
      retry: { baseDelayMs: 100, maxAttempts: 2, maxDelayMs: 200 },
    });

    const result = client.bank.getSync();
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

  it("does not retry unless configured", async () => {
    const fetch = createFetchSequence([new Response(null, { status: 503 })]);
    const client = new MonobankPublicClient({ fetch });

    await expect(client.bank.getSync()).rejects.toMatchObject({ status: 503 });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("keeps public error diagnostics without requiring a token", async () => {
    const fetch = createFetchSequence([
      new Response("public endpoint denied", { status: 403 }),
    ]);
    const client = new MonobankPublicClient({ fetch });

    await expect(client.bank.getSync()).rejects.toMatchObject({
      upstreamMessage: "public endpoint denied",
    });
  });
});
