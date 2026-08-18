import { afterEach, describe, expect, it, vi } from "vitest";

import {
  acquiringQrCashierListFixture,
  acquiringQrDetailsFixture,
} from "../../../tests/fixtures/acquiring/qr.js";
import { expectCallerCancellation } from "../../../tests/support/caller-cancellation.js";
import { createAbortableFetch } from "../../../tests/support/create-abortable-fetch.js";
import {
  createFetchSequence,
  jsonResponse,
} from "../../../tests/support/create-fetch-sequence.js";
import {
  firstRequestBody,
  firstRequestHeaders,
  firstRequestUrl,
} from "../../../tests/support/fetch-request-inspection.js";
import { MonobankApiError } from "../../errors/monobank-api-error.js";
import { MonobankResponseValidationError } from "../../errors/monobank-response-validation-error.js";
import { MonobankValidationError } from "../../errors/monobank-validation-error.js";
import { MonobankAcquiringClient } from "../client/monobank-acquiring-client.js";

function createClient(fetch: ReturnType<typeof createFetchSequence>) {
  return new MonobankAcquiringClient({ fetch, token: "acquiring-token" });
}

describe("MonobankAcquiringQr", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads the authenticated QR cashier list", async () => {
    const fetch = createFetchSequence([
      jsonResponse(acquiringQrCashierListFixture),
    ]);
    const client = createClient(fetch);

    await expect(client.qr.list()).resolves.toEqual(
      acquiringQrCashierListFixture,
    );
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/api/merchant/qr/list",
    );
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("GET");
    expect(firstRequestHeaders(fetch).get("X-Token")).toBe("acquiring-token");
  });

  it("loads authenticated details for one QR cashier", async () => {
    const fetch = createFetchSequence([
      jsonResponse(acquiringQrDetailsFixture),
    ]);
    const client = createClient(fetch);

    await expect(
      client.qr.getDetails({ qrId: "XJ_DiM4rTd5V" }),
    ).resolves.toEqual(acquiringQrDetailsFixture);
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/api/merchant/qr/details?qrId=XJ_DiM4rTd5V",
    );
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("GET");
    expect(firstRequestHeaders(fetch).get("X-Token")).toBe("acquiring-token");
  });

  it("rejects a malformed QR cashier list", async () => {
    const fetch = createFetchSequence([
      jsonResponse({ list: [{ amountType: "operator", shortQrId: "OBJE" }] }),
    ]);

    await expect(createClient(fetch).qr.list()).rejects.toBeInstanceOf(
      MonobankResponseValidationError,
    );
  });

  it("rejects malformed QR cashier details", async () => {
    const fetch = createFetchSequence([jsonResponse({ invoiceId: 42 })]);

    await expect(
      createClient(fetch).qr.getDetails({ qrId: "XJ_DiM4rTd5V" }),
    ).rejects.toBeInstanceOf(MonobankResponseValidationError);
  });

  it("uses the configured safe retry policy when listing", async () => {
    vi.useFakeTimers();
    const fetch = createFetchSequence([
      new Response(null, { status: 503 }),
      jsonResponse(acquiringQrCashierListFixture),
    ]);
    const client = new MonobankAcquiringClient({
      fetch,
      retry: { baseDelayMs: 100, maxAttempts: 2, maxDelayMs: 200 },
      token: "acquiring-token",
    });

    const result = client.qr.list();
    result.catch(() => undefined);
    await vi.advanceTimersByTimeAsync(100);

    await expect(result).resolves.toEqual(acquiringQrCashierListFixture);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("uses the configured safe retry policy when reading details", async () => {
    vi.useFakeTimers();
    const fetch = createFetchSequence([
      new Response(null, { status: 503 }),
      jsonResponse(acquiringQrDetailsFixture),
    ]);
    const client = new MonobankAcquiringClient({
      fetch,
      retry: { baseDelayMs: 100, maxAttempts: 2, maxDelayMs: 200 },
      token: "acquiring-token",
    });

    const result = client.qr.getDetails({ qrId: "XJ_DiM4rTd5V" });
    result.catch(() => undefined);
    await vi.advanceTimersByTimeAsync(100);

    await expect(result).resolves.toEqual(acquiringQrDetailsFixture);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each([
    {
      name: "list",
      start: (client: MonobankAcquiringClient, signal: AbortSignal) =>
        client.qr.list({ signal }),
    },
    {
      name: "details",
      start: (client: MonobankAcquiringClient, signal: AbortSignal) =>
        client.qr.getDetails({ qrId: "XJ_DiM4rTd5V" }, { signal }),
    },
    {
      name: "amount reset",
      start: (client: MonobankAcquiringClient, signal: AbortSignal) =>
        client.qr.resetAmount({ qrId: "XJ_DiM4rTd5V" }, { signal }),
    },
  ])(
    "passes caller cancellation to the active $name request",
    async ({ start }) => {
      await expectCallerCancellation(start);
    },
  );

  it("fails details requests that exceed the configured timeout", async () => {
    vi.useFakeTimers();
    const { fetch } = createAbortableFetch();
    const client = new MonobankAcquiringClient({
      fetch,
      timeoutMs: 250,
      token: "acquiring-token",
    });

    const request = client.qr.getDetails({ qrId: "XJ_DiM4rTd5V" });
    request.catch(() => undefined);
    await vi.advanceTimersByTimeAsync(250);

    await expect(request).rejects.toMatchObject({ reason: "timeout" });
  });

  it("rejects an unknown QR cashier with the API error", async () => {
    const fetch = createFetchSequence([new Response(null, { status: 404 })]);
    const request = createClient(fetch).qr.getDetails({ qrId: "XJ_DiM4rTd5V" });

    await expect(request).rejects.toBeInstanceOf(MonobankApiError);
    await expect(request).rejects.toMatchObject({
      endpoint: "/api/merchant/qr/details?qrId=XJ_DiM4rTd5V",
      status: 404,
    });
  });

  it("rejects an invalid QR cashier identifier before Fetch", async () => {
    const fetch = createFetchSequence([]);
    const client = createClient(fetch);

    await expect(client.qr.getDetails({ qrId: " " })).rejects.toBeInstanceOf(
      MonobankValidationError,
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("clears the amount set on a QR cashier", async () => {
    const fetch = createFetchSequence([jsonResponse({})]);
    const client = createClient(fetch);

    await expect(
      client.qr.resetAmount({ qrId: "XJ_DiM4rTd5V" }),
    ).resolves.toBeUndefined();
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/api/merchant/qr/reset-amount",
    );
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(firstRequestHeaders(fetch).get("X-Token")).toBe("acquiring-token");
    expect(firstRequestHeaders(fetch).get("Content-Type")).toBe(
      "application/json",
    );
    expect(firstRequestBody(fetch)).toEqual({ qrId: "XJ_DiM4rTd5V" });
  });

  it("never retries the amount reset even with a retry policy", async () => {
    const fetch = createFetchSequence([
      new Response(null, { status: 503 }),
      jsonResponse({}),
    ]);
    const client = new MonobankAcquiringClient({
      fetch,
      retry: { baseDelayMs: 1, maxAttempts: 3, maxDelayMs: 2 },
      token: "acquiring-token",
    });

    await expect(
      client.qr.resetAmount({ qrId: "XJ_DiM4rTd5V" }),
    ).rejects.toMatchObject({ status: 503 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("rejects an unknown QR cashier when clearing the amount", async () => {
    const fetch = createFetchSequence([new Response(null, { status: 404 })]);

    const request = createClient(fetch).qr.resetAmount({
      qrId: "XJ_DiM4rTd5V",
    });

    await expect(request).rejects.toBeInstanceOf(MonobankApiError);
    await expect(request).rejects.toMatchObject({
      endpoint: "/api/merchant/qr/reset-amount",
      status: 404,
    });
  });

  it("rejects an invalid amount-reset identifier before Fetch", async () => {
    const fetch = createFetchSequence([]);
    const client = createClient(fetch);

    await expect(client.qr.resetAmount({ qrId: "" })).rejects.toBeInstanceOf(
      MonobankValidationError,
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
