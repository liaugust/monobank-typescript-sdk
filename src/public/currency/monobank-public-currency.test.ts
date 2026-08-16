import { describe, expect, it } from "vitest";

import { currencyRateFixture } from "../../../tests/fixtures/public/currency.js";
import {
  createFetchSequence,
  jsonResponse,
} from "../../../tests/support/create-fetch-sequence.js";
import {
  firstRequestHeaders,
  firstRequestUrl,
} from "../../../tests/support/fetch-request-inspection.js";
import { MonobankResponseValidationError } from "../../errors/monobank-response-validation-error.js";
import { MonobankPublicClient } from "../client/monobank-public-client.js";

describe("MonobankPublicCurrency", () => {
  it("loads public currency rates without a token", async () => {
    const fetch = createFetchSequence([jsonResponse([currencyRateFixture])]);
    const client = new MonobankPublicClient({ fetch });

    await expect(client.currency.getRates()).resolves.toEqual([
      currencyRateFixture,
    ]);
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/bank/currency",
    );
    expect(firstRequestHeaders(fetch).has("X-Token")).toBe(false);
  });

  it("uses custom base URLs without adding credentials", async () => {
    const fetch = createFetchSequence([jsonResponse([currencyRateFixture])]);
    const client = new MonobankPublicClient({
      baseUrl: "https://gateway.example.test/mono/",
      fetch,
    });

    await client.currency.getRates();

    expect(firstRequestUrl(fetch).href).toBe(
      "https://gateway.example.test/bank/currency",
    );
    expect(firstRequestHeaders(fetch).has("X-Token")).toBe(false);
  });

  it("passes caller cancellation to currency requests", async () => {
    const fetch = createFetchSequence([jsonResponse([currencyRateFixture])]);
    const client = new MonobankPublicClient({ fetch });
    const controller = new AbortController();

    await client.currency.getRates({ signal: controller.signal });

    expect(fetch.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("turns malformed successful payloads into validation errors", async () => {
    const fetch = createFetchSequence([
      new Response("{not-json", { status: 200 }),
    ]);
    const client = new MonobankPublicClient({ fetch });

    await expect(client.currency.getRates()).rejects.toBeInstanceOf(
      MonobankResponseValidationError,
    );
  });
});
