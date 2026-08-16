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
