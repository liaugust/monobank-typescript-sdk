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
    JSON.stringify(error).includes("secret-token"),
  );
}

describe("MonobankTransport", () => {
  afterEach(() => {
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
    expect(init?.signal).toBe(controller.signal);
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

    await expect(getBankSync(transport)).rejects.toMatchObject({
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
    const fetch = createFetchSequence([jsonResponse({ ok: "yes" })]);
    const transport = new MonobankTransport({ fetch, token: "secret-token" });

    await expect(getBankSync(transport)).rejects.toBeInstanceOf(
      MonobankResponseValidationError,
    );
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
