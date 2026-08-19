import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createFetchSequence,
  jsonResponse,
} from "../../tests/support/create-fetch-sequence.js";
import {
  firstRequestUrl,
  getBankSync,
  passthroughSchema,
} from "../../tests/support/transport.js";
import { MonobankValidationError } from "../errors/monobank-validation-error.js";
import { MonobankTransport } from "./transport.js";

describe("MonobankTransport options", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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

  it.each([
    ["an empty token", ""],
    ["a padded token", " secret-token "],
    ["a token that would inject a header", "secret\r\nX-Sign: forged"],
  ])("rejects %s at construction", (_label, token) => {
    expect(
      () => new MonobankTransport({ fetch: createFetchSequence([]), token }),
    ).toThrow(MonobankValidationError);
  });

  it.each([
    "http://api.example.test",
    "http://gateway.example.test:8080/mono/",
    "http://127.0.0.1.example.test",
    "http://notlocalhost",
    "http://localhost.evil.test",
    "http://evil.test.localhost",
    "http://api.localhost",
    "http://.localhost",
    "http://user@evil.test",
    "http://localhost@evil.test",
    "http://127.0.0.1@evil.test",
    "http://[::1]@evil.test",
    "http://0.0.0.0",
    "http://[fe80::1]",
    "http://[::]",
    "http://[::ffff:127.0.0.1]",
  ])(
    "rejects cleartext base URL %s when a credential is configured",
    (baseUrl) => {
      expect(
        () =>
          new MonobankTransport({
            baseUrl,
            fetch: createFetchSequence([]),
            token: "secret-token",
          }),
      ).toThrow(
        expect.objectContaining({
          constructor: MonobankValidationError,
          issues: [
            "baseUrl must use https when a credential is configured, unless it targets a loopback host",
          ],
        }),
      );
    },
  );

  it.each([
    { baseUrl: "http://127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
    { baseUrl: "http://127.5.6.7", origin: "http://127.5.6.7" },
    { baseUrl: "http://localhost:8080", origin: "http://localhost:8080" },
    { baseUrl: "http://localhost.", origin: "http://localhost." },
    { baseUrl: "http://LOCALHOST", origin: "http://localhost" },
    { baseUrl: "http://[::1]:3000", origin: "http://[::1]:3000" },
    { baseUrl: "http://2130706433", origin: "http://127.0.0.1" },
    { baseUrl: "http://0177.0.0.1", origin: "http://127.0.0.1" },
    { baseUrl: "http://0x7f000001", origin: "http://127.0.0.1" },
    { baseUrl: "http://127.1", origin: "http://127.0.0.1" },
  ])(
    "allows loopback base URL $baseUrl with a token",
    async ({ baseUrl, origin }) => {
      const fetch = createFetchSequence([jsonResponse({ ok: true })]);
      const transport = new MonobankTransport({
        baseUrl,
        fetch,
        token: "secret-token",
      });

      await getBankSync(transport);

      expect(firstRequestUrl(fetch).href).toBe(`${origin}/bank/sync`);
    },
  );

  it("allows a cleartext base URL when no token is configured", () => {
    expect(
      () =>
        new MonobankTransport({
          baseUrl: "http://api.example.test",
          fetch: createFetchSequence([]),
        }),
    ).not.toThrow();
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
