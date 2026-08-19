import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createFetchSequence,
  jsonResponse,
} from "../../tests/support/create-fetch-sequence.js";
import {
  abortDomException,
  abortGenericError,
  createAbortRejectingFetch,
  createRetryingTransport,
  createSignalBoundTextFetch,
  expectRejectsWithoutSecret,
  flushMicrotasks,
  getBankSync,
  getPersonalClientInfo,
  passthroughSchema,
  requestSafeGet,
  requestSafeGetWithSignal,
  settleState,
  shortRetry,
  textResponse,
} from "../../tests/support/transport.js";
import { MonobankTransport } from "./transport.js";

describe("MonobankTransport", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("handles successful empty POST responses", async () => {
    const fetch = createFetchSequence([textResponse("", { status: 200 })]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await expect(
      transport.postEmpty({
        auth: true,
        endpoint: "/personal/webhook",
      }),
    ).resolves.toBeUndefined();
  });

  it.each([
    {
      method: "POST",
      start: (transport: MonobankTransport) =>
        transport.postEmpty({ auth: true, endpoint: "/personal/webhook" }),
    },
    {
      method: "DELETE",
      start: (transport: MonobankTransport) =>
        transport.deleteEmpty({ auth: true, endpoint: "/personal/webhook" }),
    },
  ])("releases the response body of an empty $method", async ({ start }) => {
    const response = textResponse("{}", { status: 200 });
    const fetch = createFetchSequence([response]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await start(transport);

    expect(response.bodyUsed).toBe(true);
  });

  it("wraps Fetch failures without retaining request credentials", async () => {
    const fetch = createFetchSequence([
      new Error("socket secret-token closed"),
    ]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await expectRejectsWithoutSecret(getPersonalClientInfo(transport));
  });

  it("wraps non-Error Fetch rejections as network failures without a cause", async () => {
    const rejection: unknown = "socket closed";
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- Custom Fetch implementations can reject with non-Error values.
    const fetch = vi.fn(() => Promise.reject(rejection));
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await expect(getBankSync(transport)).rejects.toMatchObject({
      cause: undefined,
      reason: "network",
    });
  });

  it("skips a status the configured policy excludes", async () => {
    const fetch = createFetchSequence([
      jsonResponse({ message: "rate limited" }, { status: 429 }),
    ]);
    const transport = new MonobankTransport({
      fetch,
      retry: { ...shortRetry, retryableStatusCodes: [500, 502, 503, 504] },
      token: "secret-token",
    });

    await expect(requestSafeGet(transport)).rejects.toMatchObject({
      status: 429,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries a status the configured policy includes", async () => {
    const fetch = createFetchSequence([
      jsonResponse({ message: "conflict" }, { status: 409 }),
      jsonResponse({ ok: true }),
    ]);
    const transport = new MonobankTransport({
      fetch,
      retry: { ...shortRetry, retryableStatusCodes: [409] },
      token: "secret-token",
    });

    await expect(requestSafeGet(transport)).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("retries the documented default statuses when none are configured", async () => {
    const fetch = createFetchSequence([
      jsonResponse({ message: "rate limited" }, { status: 429 }),
      jsonResponse({ ok: true }),
    ]);
    const transport = createRetryingTransport(fetch);

    await expect(requestSafeGet(transport)).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("classifies caller abort during Fetch as aborted", async () => {
    const controller = new AbortController();
    const fetch = createAbortRejectingFetch();
    const transport = createRetryingTransport(fetch);

    const result = requestSafeGetWithSignal(transport, controller.signal);
    result.catch(() => undefined);
    controller.abort();

    await expect(result).rejects.toMatchObject({
      reason: "aborted",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("rejects a pre-aborted caller signal before Fetch", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetch = createFetchSequence([jsonResponse({ ok: true })]);
    const transport = new MonobankTransport({
      fetch,
      token: "secret-token",
    });

    await expect(
      transport.getJson({
        auth: true,
        endpoint: "/personal/client-info",
        retryable: true,
        schema: passthroughSchema,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({
      reason: "aborted",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("classifies timeout aborts as timeout", async () => {
    vi.useFakeTimers();
    const fetch = createAbortRejectingFetch();
    const transport = new MonobankTransport({
      fetch,
      timeoutMs: 250,
      token: "secret-token",
    });

    const result = requestSafeGet(transport);
    result.catch(() => undefined);
    await vi.advanceTimersByTimeAsync(249);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);

    await expect(result).rejects.toMatchObject({
      reason: "timeout",
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("classifies caller abort while reading a successful body as aborted", async () => {
    const controller = new AbortController();
    const { fetch, textStarted } = createSignalBoundTextFetch(
      200,
      abortDomException,
    );
    const transport = createRetryingTransport(fetch);

    const result = requestSafeGetWithSignal(transport, controller.signal);
    result.catch(() => undefined);
    await textStarted;
    controller.abort();
    await flushMicrotasks();

    expect(await settleState(result)).toMatchObject({
      reason: "aborted",
    });
  });

  it("classifies timeout while reading a successful body as timeout", async () => {
    vi.useFakeTimers();
    const { fetch, textStarted } = createSignalBoundTextFetch(
      200,
      abortDomException,
    );
    const transport = new MonobankTransport({
      fetch,
      timeoutMs: 250,
      token: "secret-token",
    });

    const result = requestSafeGet(transport);
    result.catch(() => undefined);
    await textStarted;
    await vi.advanceTimersByTimeAsync(250);
    await flushMicrotasks();

    expect(await settleState(result)).toMatchObject({
      reason: "timeout",
    });
  });

  it.each([
    ["DOMException", abortDomException],
    ["generic Error", abortGenericError],
  ])(
    "classifies %s timeout failures while reading retryable API error bodies as timeout",
    async (_, abortFailure) => {
      vi.useFakeTimers();
      const { fetch, textStarted } = createSignalBoundTextFetch(
        503,
        abortFailure,
      );
      const transport = new MonobankTransport({
        fetch,
        retry: shortRetry,
        timeoutMs: 250,
        token: "secret-token",
      });

      const result = requestSafeGet(transport);
      result.catch(() => undefined);
      await textStarted;
      await vi.advanceTimersByTimeAsync(250);
      await flushMicrotasks();

      expect(await settleState(result)).toMatchObject({
        reason: "timeout",
      });
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );

  it("removes caller abort listeners after successful requests", async () => {
    const fetch = createFetchSequence([jsonResponse({ ok: true })]);
    const controller = new AbortController();
    const removeEventListener = vi.spyOn(
      controller.signal,
      "removeEventListener",
    );
    const transport = new MonobankTransport({
      fetch,
      token: "secret-token",
    });

    await transport.getJson({
      auth: true,
      endpoint: "/personal/client-info",
      schema: passthroughSchema,
      signal: controller.signal,
    });

    expect(removeEventListener).toHaveBeenCalledWith(
      "abort",
      expect.any(Function),
    );
  });
});
