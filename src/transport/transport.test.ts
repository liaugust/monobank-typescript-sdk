import { afterEach, describe, expect, it, vi } from "vitest";
import * as z from "zod/mini";

import {
  createFetchSequence,
  jsonResponse,
} from "../../tests/support/create-fetch-sequence.js";
import { MonobankApiError } from "../errors/monobank-api-error.js";
import { MonobankResponseValidationError } from "../errors/monobank-response-validation-error.js";
import { MonobankValidationError } from "../errors/monobank-validation-error.js";
import { MonobankTransport } from "./transport.js";

const passthroughSchema = z.looseObject({ ok: z.boolean() });
const shortRetry = { baseDelayMs: 100, maxAttempts: 2, maxDelayMs: 100 };
type TestFetch = NonNullable<
  ConstructorParameters<typeof MonobankTransport>[0]["fetch"]
>;

function textResponse(body: string, init: ResponseInit = {}): Response {
  return new Response(body, init);
}

async function getBankSync(
  transport: MonobankTransport,
  options: { readonly auth?: boolean; readonly retryable?: boolean } = {},
) {
  return transport.getJson({
    auth: options.auth ?? false,
    endpoint: "/bank/sync",
    schema: passthroughSchema,
    ...(options.retryable === undefined
      ? {}
      : { retryable: options.retryable }),
  });
}

async function getPersonalClientInfo(transport: MonobankTransport) {
  return transport.getJson({
    auth: true,
    endpoint: "/personal/client-info",
    schema: passthroughSchema,
  });
}

async function requestSafeGet(transport: MonobankTransport) {
  return transport.getJson({
    auth: true,
    endpoint: "/personal/client-info",
    retryable: true,
    schema: passthroughSchema,
  });
}

async function requestSafePost(transport: MonobankTransport) {
  return transport.postJson({
    auth: true,
    endpoint: "/personal/webhook",
    retryable: true,
    schema: passthroughSchema,
  });
}

function requestSafeGetWithSignal(
  transport: MonobankTransport,
  signal: AbortSignal,
) {
  return transport.getJson({
    auth: true,
    endpoint: "/personal/client-info",
    retryable: true,
    schema: passthroughSchema,
    signal,
  });
}

function createRetryingTransport(fetch: TestFetch): MonobankTransport {
  return new MonobankTransport({
    fetch,
    retry: shortRetry,
    token: "secret-token",
  });
}

function createAbortRejectingFetch(): TestFetch {
  return vi.fn((_: RequestInfo | URL, init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(new DOMException("Request aborted", "AbortError"));
      });
    });
  });
}

function createSignalBoundTextFetch(
  status: number,
  abortFailure: () => Error | DOMException,
): {
  readonly fetch: TestFetch;
  readonly textStarted: Promise<void>;
} {
  let markTextStarted: () => void = () => undefined;
  const textStarted = new Promise<void>((resolve) => {
    markTextStarted = resolve;
  });
  const fetch = vi.fn((_: RequestInfo | URL, init?: RequestInit) => {
    const response = {
      headers: new Headers(),
      ok: status >= 200 && status < 300,
      status,
      text: () => {
        markTextStarted();

        return new Promise<string>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(abortFailure());
          });
        });
      },
    } as Response;

    return Promise.resolve(response);
  });

  return { fetch, textStarted };
}

function abortDomException(): DOMException {
  return new DOMException("Body aborted", "AbortError");
}

function abortGenericError(): Error {
  return new Error("Body read stopped");
}

async function settleState(request: Promise<unknown>): Promise<unknown> {
  let state: unknown = "pending";
  request.then(
    (value) => {
      state = value;
    },
    (error: unknown) => {
      state = error;
    },
  );
  await flushMicrotasks();

  return state;
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function firstRequestInit(
  fetch: ReturnType<typeof createFetchSequence>,
): RequestInit | undefined {
  const [, init] = fetch.mock.calls[0] ?? [];

  return init;
}

function firstRequestUrl(fetch: ReturnType<typeof createFetchSequence>): URL {
  const [input] = fetch.mock.calls[0] ?? [];
  expect(input).toBeInstanceOf(URL);
  if (!(input instanceof URL)) {
    throw new Error("Transport should call Fetch with a URL instance");
  }

  return input;
}

async function expectRejectsWithoutSecret(request: Promise<unknown>) {
  await expect(request).rejects.not.toSatisfy((error: unknown) =>
    containsStringRecursively(error, "secret-token"),
  );
}

async function captureRejection(request: Promise<unknown>): Promise<unknown> {
  try {
    await request;
  } catch (error) {
    return error;
  }

  throw new Error("Expected request to reject");
}

function containsStringRecursively(
  value: unknown,
  needle: string,
  seen = new Set<object>(),
): boolean {
  if (typeof value === "string") {
    return value.includes(needle);
  }

  if (value instanceof Error) {
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);

    const values: unknown[] = [value.message, value.cause];
    for (const key of Object.keys(value)) {
      values.push((value as unknown as Readonly<Record<string, unknown>>)[key]);
    }

    return values.some((item) => containsStringRecursively(item, needle, seen));
  }

  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (seen.has(value)) {
    return false;
  }
  seen.add(value);

  return Object.values(value).some((item) =>
    containsStringRecursively(item, needle, seen),
  );
}

describe("MonobankTransport", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("never sends the token to public endpoints", async () => {
    const fetch = createFetchSequence([jsonResponse({ ok: true })]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await getBankSync(transport);

    const init = firstRequestInit(fetch);
    expect(new Headers(init?.headers).has("X-Token")).toBe(false);
  });

  it("sends the token only for authenticated requests", async () => {
    const fetch = createFetchSequence([jsonResponse({ ok: true })]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await transport.getJson({
      auth: true,
      endpoint: "/personal/client-info",
      schema: passthroughSchema,
    });

    const [, init] = fetch.mock.calls[0] ?? [];
    expect(new Headers(init?.headers).get("X-Token")).toBe("secret-token");
  });

  it("normalizes the base URL and endpoint into one absolute request URL", async () => {
    const fetch = createFetchSequence([jsonResponse({ ok: true })]);
    const transport = new MonobankTransport({
      baseUrl: "https://example.test/",
      fetch,
      token: "secret-token",
    });

    await transport.getJson({
      auth: false,
      endpoint: "/bank/currency",
      schema: passthroughSchema,
    });

    expect(firstRequestUrl(fetch).href).toBe(
      "https://example.test/bank/currency",
    );
  });

  it("uses global Fetch and the default Monobank base URL when no overrides are supplied", async () => {
    const fetch = createFetchSequence([jsonResponse({ ok: true })]);
    vi.stubGlobal("fetch", fetch);
    const transport = new MonobankTransport({ token: "secret-token" });

    await getBankSync(transport);

    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/bank/sync",
    );
  });

  it("sets JSON accept headers without content type for bodyless requests", async () => {
    const fetch = createFetchSequence([jsonResponse({ ok: true })]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });
    const controller = new AbortController();

    await transport.getJson({
      auth: false,
      endpoint: "/bank/sync",
      schema: passthroughSchema,
      signal: controller.signal,
    });

    const init = firstRequestInit(fetch);
    const headers = new Headers(init?.headers);
    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.has("Content-Type")).toBe(false);
    expect(init?.method).toBe("GET");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("sets content type and serializes JSON bodies for postJson", async () => {
    const fetch = createFetchSequence([jsonResponse({ ok: true })]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await transport.postJson({
      auth: true,
      body: { webHookUrl: "https://example.test/hook" },
      endpoint: "/personal/webhook",
      schema: passthroughSchema,
    });

    const [, init] = fetch.mock.calls[0] ?? [];
    const headers = new Headers(init?.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(init?.body).toBe('{"webHookUrl":"https://example.test/hook"}');
    expect(init?.method).toBe("POST");
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

  it("stores valid retry and timeout options without changing single-attempt execution", async () => {
    const fetch = createFetchSequence([jsonResponse({ ok: true })]);
    const transport = new MonobankTransport({
      fetch,
      retry: { baseDelayMs: 100, maxAttempts: 2, maxDelayMs: 500 },
      timeoutMs: 5_000,
      token: "secret-token",
    });

    await getBankSync(transport, { retryable: true });

    expect(fetch).toHaveBeenCalledOnce();
  });

  it("returns parsed JSON after schema validation succeeds", async () => {
    const fetch = createFetchSequence([
      jsonResponse({ ok: true, extra: "preserved" }),
    ]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await expect(getBankSync(transport)).resolves.toEqual({
      ok: true,
      extra: "preserved",
    });
  });

  it("turns malformed successful JSON into a response validation error", async () => {
    const fetch = createFetchSequence([
      textResponse("{not-json", {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    ]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });
    const error = await captureRejection(getBankSync(transport));

    expect(error).toBeInstanceOf(MonobankResponseValidationError);
    expect(error).toMatchObject({
      endpoint: "/bank/sync",
      issues: [
        {
          code: "invalid_json",
          message: "Response body is not valid JSON.",
          path: [],
        },
      ],
      name: "MonobankResponseValidationError",
    });
  });

  it("turns schema failures into safe response validation errors", async () => {
    const fetch = createFetchSequence([
      jsonResponse({ ok: "secret-token", rawAccountPayload: true }),
    ]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });
    const error = await captureRejection(getBankSync(transport));

    expect(error).toBeInstanceOf(MonobankResponseValidationError);
    expect(error).toMatchObject({
      endpoint: "/bank/sync",
      issues: [
        {
          code: "invalid_type",
          path: ["ok"],
        },
      ],
      name: "MonobankResponseValidationError",
    });
    expect(containsStringRecursively(error, "secret-token")).toBe(false);
    expect(containsStringRecursively(error, "rawAccountPayload")).toBe(false);
  });

  it("uses errorDescription from JSON error responses", async () => {
    const fetch = createFetchSequence([
      jsonResponse(
        { errorDescription: "Too many requests for this endpoint" },
        {
          headers: { "Retry-After": "60", "X-Token": "secret-token" },
          status: 429,
        },
      ),
    ]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await expect(getPersonalClientInfo(transport)).rejects.toMatchObject({
      headers: {
        "content-type": "application/json",
        "retry-after": "60",
      },
      retryAfterMs: 60_000,
      status: 429,
      upstreamMessage: "Too many requests for this endpoint",
    });
  });

  it("falls back to bounded JSON text when JSON errors omit errorDescription", async () => {
    const fetch = createFetchSequence([
      jsonResponse({ message: "Plain upstream JSON error" }, { status: 400 }),
    ]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await expect(getBankSync(transport)).rejects.toMatchObject({
      upstreamMessage: '{"message":"Plain upstream JSON error"}',
    });
  });

  it("keeps at most 1024 safe characters from text error responses", async () => {
    const body = `${"a".repeat(1_024)}secret-token${"b".repeat(16)}`;
    const fetch = createFetchSequence([
      textResponse(body, {
        headers: { "Content-Type": "text/plain" },
        status: 500,
      }),
    ]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await expect(getPersonalClientInfo(transport)).rejects.toMatchObject({
      upstreamMessage: "a".repeat(1_024),
    });
  });

  it.each([
    ["HTML", "<html><body>bad gateway</body></html>"],
    ["empty", ""],
  ])("defensively parses %s error bodies", async (_, body) => {
    const fetch = createFetchSequence([
      textResponse(body, {
        headers: { "Content-Type": "text/html" },
        status: 502,
      }),
    ]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await expect(getBankSync(transport)).rejects.toBeInstanceOf(
      MonobankApiError,
    );
  });

  it("handles unreadable error bodies without retaining the raw response", async () => {
    const unreadableResponse = {
      headers: new Headers(),
      ok: false,
      status: 503,
      text: async () => Promise.reject(new Error("Body stream failed")),
    } as Response;
    const fetch = createFetchSequence([unreadableResponse]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await expect(getBankSync(transport)).rejects.toMatchObject({
      status: 503,
      upstreamMessage: undefined,
    });
  });

  it("keeps ordinary non-abort DOMException body failures as unreadable error bodies", async () => {
    const unreadableResponse = {
      headers: new Headers(),
      ok: false,
      status: 503,
      text: async () =>
        Promise.reject(new DOMException("Stream lost", "NetworkError")),
    } as Response;
    const fetch = createFetchSequence([unreadableResponse]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await expect(getBankSync(transport)).rejects.toMatchObject({
      status: 503,
      upstreamMessage: undefined,
    });
  });

  it("wraps Fetch failures without retaining request credentials", async () => {
    const fetch = createFetchSequence([
      new Error("socket secret-token closed"),
    ]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await expectRejectsWithoutSecret(getPersonalClientInfo(transport));
  });

  it.each([
    ["absolute", "https://evil.test/personal/client-info"],
    ["protocol-relative", "//evil.test/personal/client-info"],
    ["relative", "personal/client-info"],
    ["authenticated public", "/bank/sync"],
  ])("rejects %s authenticated endpoint before Fetch", async (_, endpoint) => {
    const fetch = createFetchSequence([jsonResponse({ ok: true })]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await expect(
      transport.getJson({
        auth: true,
        endpoint,
        schema: passthroughSchema,
      }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
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

  it("does not expose token text from thrown API errors", async () => {
    const fetch = createFetchSequence([
      jsonResponse(
        { errorDescription: "token secret-token was rejected" },
        {
          headers: { "X-Token": "secret-token" },
          status: 401,
        },
      ),
    ]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await expectRejectsWithoutSecret(getPersonalClientInfo(transport));
  });

  it("rejects invalid transport configuration before requests", () => {
    const invalidOptions = [
      { token: "" },
      { token: " secret-token" },
      { baseUrl: "not a url", token: "secret-token" },
      { baseUrl: "ftp://example.test", token: "secret-token" },
      { timeoutMs: 0, token: "secret-token" },
      {
        retry: { baseDelayMs: 100, maxAttempts: 0, maxDelayMs: 100 },
        token: "secret-token",
      },
      {
        retry: { baseDelayMs: 0, maxAttempts: 2, maxDelayMs: 100 },
        token: "secret-token",
      },
      {
        retry: { baseDelayMs: 100, maxAttempts: 2, maxDelayMs: 0 },
        token: "secret-token",
      },
      {
        retry: { baseDelayMs: 200, maxAttempts: 2, maxDelayMs: 100 },
        token: "secret-token",
      },
    ] satisfies ConstructorParameters<typeof MonobankTransport>[0][];

    for (const options of invalidOptions) {
      expect(() => new MonobankTransport(options)).toThrow(
        MonobankValidationError,
      );
    }
  });

  it("rejects missing Fetch when no injected Fetch is supplied", () => {
    vi.stubGlobal("fetch", undefined);

    expect(() => new MonobankTransport({ token: "secret-token" })).toThrow(
      MonobankValidationError,
    );
  });
});
