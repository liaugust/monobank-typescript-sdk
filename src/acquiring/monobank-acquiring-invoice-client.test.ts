import { afterEach, describe, expect, it, vi } from "vitest";

import {
  cancellationFixture,
  finalizationFixture,
  fiscalChecksFixture,
  invoiceStatusFixture,
  newInvoiceFixture,
  receiptFixture,
} from "../../tests/fixtures/acquiring-api.js";
import {
  createFetchSequence,
  jsonResponse,
} from "../../tests/support/create-fetch-sequence.js";
import {
  firstRequestHeaders,
  firstRequestUrl,
} from "../../tests/support/fetch-request-inspection.js";
import { MonobankResponseValidationError } from "../errors/monobank-response-validation-error.js";
import { MonobankValidationError } from "../errors/monobank-validation-error.js";
import { MonobankAcquiringClient } from "./client/monobank-acquiring-client.js";
import { InvoicePaymentType } from "./invoice.js";

function firstRequestBody(fetch: ReturnType<typeof createFetchSequence>) {
  const body = fetch.mock.calls[0]?.[1]?.body;

  if (typeof body !== "string") {
    throw new TypeError("Client should send a JSON string body");
  }

  return JSON.parse(body) as unknown;
}

describe("MonobankAcquiringClient invoice lifecycle", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates an invoice with a validated JSON body", async () => {
    const fetch = createFetchSequence([jsonResponse(newInvoiceFixture)]);
    const client = new MonobankAcquiringClient({ fetch, token: "token" });

    await expect(
      client.createInvoice(
        {
          amount: 4_200,
          merchantPaymInfo: { reference: "order-42" },
          paymentType: InvoicePaymentType.Hold,
        },
        {
          cms: "Synthetic Shop",
          cmsVersion: "1.2.3",
        },
      ),
    ).resolves.toEqual(newInvoiceFixture);
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/api/merchant/invoice/create",
    );
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(firstRequestHeaders(fetch).get("X-Token")).toBe("token");
    expect(firstRequestHeaders(fetch).get("X-Cms")).toBe("Synthetic Shop");
    expect(firstRequestHeaders(fetch).get("X-Cms-Version")).toBe("1.2.3");
    expect(firstRequestBody(fetch)).toEqual({
      amount: 4_200,
      merchantPaymInfo: { reference: "order-42" },
      paymentType: "hold",
    });
  });

  it("loads an encoded invoice status", async () => {
    const fetch = createFetchSequence([jsonResponse(invoiceStatusFixture)]);
    const client = new MonobankAcquiringClient({ fetch, token: "token" });

    await expect(
      client.getInvoiceStatus({ invoiceId: "invoice/42" }),
    ).resolves.toEqual(invoiceStatusFixture);
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/api/merchant/invoice/status?invoiceId=invoice%2F42",
    );
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("GET");
  });

  it("cancels an invoice payment without retrying the mutation", async () => {
    const fetch = createFetchSequence([
      new Response(null, { status: 503 }),
      jsonResponse(cancellationFixture),
    ]);
    const client = new MonobankAcquiringClient({
      fetch,
      retry: { baseDelayMs: 1, maxAttempts: 2, maxDelayMs: 2 },
      token: "token",
    });

    await expect(
      client.cancelInvoice({
        amount: 2_100,
        extRef: "refund-42",
        invoiceId: "invoice-42",
      }),
    ).rejects.toMatchObject({ status: 503 });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(firstRequestBody(fetch)).toEqual({
      amount: 2_100,
      extRef: "refund-42",
      invoiceId: "invoice-42",
    });
  });

  it("removes an unpaid invoice", async () => {
    const fetch = createFetchSequence([jsonResponse({})]);
    const client = new MonobankAcquiringClient({ fetch, token: "token" });

    await expect(
      client.removeInvoice({ invoiceId: "invoice-42" }),
    ).resolves.toBeUndefined();
    expect(firstRequestUrl(fetch).pathname).toBe(
      "/api/merchant/invoice/remove",
    );
    expect(firstRequestBody(fetch)).toEqual({ invoiceId: "invoice-42" });
  });

  it("finalizes a held invoice amount", async () => {
    const fetch = createFetchSequence([jsonResponse(finalizationFixture)]);
    const client = new MonobankAcquiringClient({ fetch, token: "token" });

    await expect(
      client.finalizeInvoice({ amount: 4_200, invoiceId: "invoice-42" }),
    ).resolves.toEqual(finalizationFixture);
    expect(firstRequestUrl(fetch).pathname).toBe(
      "/api/merchant/invoice/finalize",
    );
    expect(firstRequestBody(fetch)).toEqual({
      amount: 4_200,
      invoiceId: "invoice-42",
    });
  });

  it("loads a receipt with an encoded optional email", async () => {
    const fetch = createFetchSequence([jsonResponse(receiptFixture)]);
    const client = new MonobankAcquiringClient({ fetch, token: "token" });

    await expect(
      client.getInvoiceReceipt({
        email: "buyer+mono@example.test",
        invoiceId: "invoice-42",
      }),
    ).resolves.toEqual(receiptFixture);
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/api/merchant/invoice/receipt?invoiceId=invoice-42&email=buyer%2Bmono%40example.test",
    );
  });

  it("loads invoice fiscal checks", async () => {
    const fetch = createFetchSequence([jsonResponse(fiscalChecksFixture)]);
    const client = new MonobankAcquiringClient({ fetch, token: "token" });

    await expect(
      client.getInvoiceFiscalChecks({ invoiceId: "invoice-42" }),
    ).resolves.toEqual(fiscalChecksFixture);
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/api/merchant/invoice/fiscal-checks?invoiceId=invoice-42",
    );
  });

  it("retries safe invoice GET requests", async () => {
    vi.useFakeTimers();
    const fetch = createFetchSequence([
      new Response(null, { status: 503 }),
      jsonResponse(invoiceStatusFixture),
    ]);
    const client = new MonobankAcquiringClient({
      fetch,
      retry: { baseDelayMs: 100, maxAttempts: 2, maxDelayMs: 200 },
      token: "token",
    });

    const result = client.getInvoiceStatus({ invoiceId: "invoice-42" });
    result.catch(() => undefined);
    await vi.advanceTimersByTimeAsync(100);

    await expect(result).resolves.toEqual(invoiceStatusFixture);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("validates request input before Fetch", async () => {
    const fetch = createFetchSequence([jsonResponse(newInvoiceFixture)]);
    const client = new MonobankAcquiringClient({ fetch, token: "token" });

    await expect(client.createInvoice({ amount: 4.2 })).rejects.toBeInstanceOf(
      MonobankValidationError,
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a malformed successful response", async () => {
    const fetch = createFetchSequence([jsonResponse({ invoiceId: 42 })]);
    const client = new MonobankAcquiringClient({ fetch, token: "token" });

    await expect(
      client.createInvoice({ amount: 4_200 }),
    ).rejects.toBeInstanceOf(MonobankResponseValidationError);
  });
});
