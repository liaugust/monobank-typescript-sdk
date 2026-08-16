import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createFetchSequence,
  jsonResponse,
} from "../../../tests/support/create-fetch-sequence.js";
import {
  createRetryingTransport,
  getBankSync,
  requestSafeGet,
  requestSafeGetWithSignal,
  requestSafePost,
} from "../../../tests/support/transport.js";
import { MonobankResponseValidationError } from "../../errors/monobank-response-validation-error.js";
import { MonobankTransport } from "../transport.js";

describe("MonobankTransport retry behavior", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not retry unless a retry policy is configured", async () => {
    const fetch = createFetchSequence([new Response(null, { status: 503 })]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await expect(requestSafeGet(transport)).rejects.toMatchObject({
      status: 503,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("honors Retry-After for a configured safe GET", async () => {
    vi.useFakeTimers();
    const fetch = createFetchSequence([
      new Response(null, { headers: { "Retry-After": "2" }, status: 429 }),
      jsonResponse({ ok: true }),
    ]);
    const transport = new MonobankTransport({
      fetch,
      retry: { baseDelayMs: 100, maxAttempts: 2, maxDelayMs: 5_000 },
      token: "secret-token",
    });

    const result = requestSafeGet(transport);
    result.catch(() => undefined);
    await vi.advanceTimersByTimeAsync(1_999);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);

    await expect(result).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("uses capped exponential backoff when Retry-After is absent", async () => {
    vi.useFakeTimers();
    const fetch = createFetchSequence([
      new Response(null, { status: 500 }),
      new Response(null, { status: 502 }),
      jsonResponse({ ok: true }),
    ]);
    const transport = new MonobankTransport({
      fetch,
      retry: { baseDelayMs: 100, maxAttempts: 3, maxDelayMs: 150 },
      token: "secret-token",
    });

    const result = requestSafeGet(transport);
    result.catch(() => undefined);
    await vi.advanceTimersByTimeAsync(99);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(149);
    expect(fetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);

    await expect(result).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it.each([429, 500, 502, 503, 504])(
    "retries status %i for configured safe GET requests",
    async (status) => {
      vi.useFakeTimers();
      const fetch = createFetchSequence([
        new Response(null, { status }),
        jsonResponse({ ok: true }),
      ]);
      const transport = new MonobankTransport({
        fetch,
        retry: { baseDelayMs: 50, maxAttempts: 2, maxDelayMs: 100 },
        token: "secret-token",
      });

      const result = requestSafeGet(transport);
      result.catch(() => undefined);
      await vi.advanceTimersByTimeAsync(50);

      await expect(result).resolves.toEqual({ ok: true });
      expect(fetch).toHaveBeenCalledTimes(2);
    },
  );

  it("does not retry when Retry-After exceeds maxDelayMs", async () => {
    vi.useFakeTimers();
    const fetch = createFetchSequence([
      new Response(null, { headers: { "Retry-After": "6" }, status: 429 }),
      jsonResponse({ ok: true }),
    ]);
    const transport = new MonobankTransport({
      fetch,
      retry: { baseDelayMs: 100, maxAttempts: 2, maxDelayMs: 5_000 },
      token: "secret-token",
    });

    await expect(requestSafeGet(transport)).rejects.toMatchObject({
      retryAfterMs: 6_000,
      status: 429,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries network failures for configured safe GET requests", async () => {
    vi.useFakeTimers();
    const fetch = createFetchSequence([
      new Error("socket closed"),
      jsonResponse({ ok: true }),
    ]);
    const transport = createRetryingTransport(fetch);

    const result = requestSafeGet(transport);
    result.catch(() => undefined);
    await vi.advanceTimersByTimeAsync(100);

    await expect(result).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("stops retrying after the configured maximum attempt", async () => {
    vi.useFakeTimers();
    const fetch = createFetchSequence([
      new Response(null, { status: 503 }),
      new Response(null, { status: 503 }),
      jsonResponse({ ok: true }),
    ]);
    const transport = createRetryingTransport(fetch);

    const result = requestSafeGet(transport);
    result.catch(() => undefined);
    await vi.advanceTimersByTimeAsync(100);

    await expect(result).rejects.toMatchObject({ status: 503 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry a GET that opts out of retries", async () => {
    const fetch = createFetchSequence([
      new Response(null, { status: 503 }),
      jsonResponse({ ok: true }),
    ]);
    const transport = createRetryingTransport(fetch);

    await expect(
      getBankSync(transport, { retryable: false }),
    ).rejects.toMatchObject({ status: 503 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry POST requests even when marked retryable", async () => {
    const fetch = createFetchSequence([
      new Response(null, { status: 503 }),
      jsonResponse({ ok: true }),
    ]);
    const transport = createRetryingTransport(fetch);

    await expect(requestSafePost(transport)).rejects.toMatchObject({
      status: 503,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([401, 403])(
    "does not retry authentication failure %i",
    async (status) => {
      const fetch = createFetchSequence([
        new Response(null, { status }),
        jsonResponse({ ok: true }),
      ]);
      const transport = createRetryingTransport(fetch);

      await expect(requestSafeGet(transport)).rejects.toMatchObject({
        status,
      });
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );

  it("does not retry schema validation failures", async () => {
    const fetch = createFetchSequence([
      jsonResponse({ ok: "wrong" }),
      jsonResponse({ ok: true }),
    ]);
    const transport = createRetryingTransport(fetch);

    await expect(requestSafeGet(transport)).rejects.toBeInstanceOf(
      MonobankResponseValidationError,
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("classifies caller abort during retry delay as aborted", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const fetch = createFetchSequence([
      new Response(null, { status: 503 }),
      jsonResponse({ ok: true }),
    ]);
    const transport = createRetryingTransport(fetch);

    const result = requestSafeGetWithSignal(transport, controller.signal);
    result.catch(() => undefined);
    await vi.advanceTimersByTimeAsync(50);
    controller.abort();

    await expect(result).rejects.toMatchObject({
      reason: "aborted",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not enter retry delay when the caller aborts while reading an error response", async () => {
    const controller = new AbortController();
    const response = {
      headers: new Headers(),
      ok: false,
      status: 503,
      text: () => {
        controller.abort();
        return Promise.resolve("");
      },
    } as Response;
    const fetch = createFetchSequence([response, jsonResponse({ ok: true })]);
    const transport = createRetryingTransport(fetch);

    await expect(
      requestSafeGetWithSignal(transport, controller.signal),
    ).rejects.toMatchObject({
      reason: "aborted",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
