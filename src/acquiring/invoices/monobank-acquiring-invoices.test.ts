import { afterEach, describe, expect, it, vi } from "vitest";

import {
  cancellationFixture,
  finalizationFixture,
  fiscalChecksFixture,
  invoiceStatusFixture,
  newInvoiceFixture,
  receiptFixture,
} from "../../../tests/fixtures/acquiring/invoices.js";
import { acquiringCardPaymentFixture } from "../../../tests/fixtures/acquiring/wallet.js";
import {
  createFetchSequence,
  jsonResponse,
} from "../../../tests/support/create-fetch-sequence.js";
import {
  firstRequestBody,
  firstRequestHeaders,
  firstRequestUrl,
} from "../../../tests/support/fetch-request-inspection.js";
import { MonobankResponseValidationError } from "../../errors/monobank-response-validation-error.js";
import { MonobankValidationError } from "../../errors/monobank-validation-error.js";
import { MonobankAcquiringClient } from "../client/monobank-acquiring-client.js";
import { InvoiceDisplayType } from "./models/invoice-display-type.js";
import { InvoicePaymentType } from "./models/invoice-payment-info.js";
import { SyncPaymentPanType } from "./sync-payment/sync-payment.js";

describe("MonobankAcquiringInvoices", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates an invoice with a validated JSON body", async () => {
    const fetch = createFetchSequence([jsonResponse(newInvoiceFixture)]);
    const client = new MonobankAcquiringClient({ fetch, token: "token" });

    await expect(
      client.invoices.create(
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
      client.invoices.getStatus({ invoiceId: "invoice/42" }),
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
      client.invoices.cancel({
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

  it("charges raw card details without retrying the payment", async () => {
    const fetch = createFetchSequence([
      new Response(null, { status: 503 }),
      jsonResponse(acquiringCardPaymentFixture),
    ]);
    const client = new MonobankAcquiringClient({
      fetch,
      retry: { baseDelayMs: 1, maxAttempts: 3, maxDelayMs: 2 },
      token: "token",
    });

    await expect(
      client.invoices.payDirect({
        amount: 4_200,
        cardData: { cvv: "123", exp: "0642", pan: "4242424242424242" },
      }),
    ).rejects.toMatchObject({ status: 503 });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(firstRequestUrl(fetch).pathname).toBe(
      "/api/merchant/invoice/payment-direct",
    );
  });

  it("settles a payment synchronously and returns the invoice", async () => {
    const fetch = createFetchSequence([jsonResponse(invoiceStatusFixture)]);
    const client = new MonobankAcquiringClient({ fetch, token: "token" });

    await expect(
      client.invoices.syncPayment({
        amount: 4_200,
        cardData: {
          eciIndicator: "02",
          exp: "0642",
          pan: "4242424242424242",
          type: SyncPaymentPanType.Fpan,
        },
        ccy: 980,
      }),
    ).resolves.toEqual(invoiceStatusFixture);
    expect(firstRequestUrl(fetch).pathname).toBe(
      "/api/merchant/invoice/sync-payment",
    );
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("POST");
  });

  it("removes an unpaid invoice", async () => {
    const fetch = createFetchSequence([jsonResponse({})]);
    const client = new MonobankAcquiringClient({ fetch, token: "token" });

    await expect(
      client.invoices.remove({ invoiceId: "invoice-42" }),
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
      client.invoices.finalize({
        amount: 4_200,
        invoiceId: "invoice-42",
      }),
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
      client.invoices.getReceipt({
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
      client.invoices.getFiscalChecks({ invoiceId: "invoice-42" }),
    ).resolves.toEqual(fiscalChecksFixture);
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/api/merchant/invoice/fiscal-checks?invoiceId=invoice-42",
    );
  });

  it("passes caller cancellation through the shared invoice resource", async () => {
    const fetch = createFetchSequence([jsonResponse(invoiceStatusFixture)]);
    const client = new MonobankAcquiringClient({ fetch, token: "token" });
    const controller = new AbortController();

    await client.invoices.getStatus(
      { invoiceId: "invoice-42" },
      { signal: controller.signal },
    );

    expect(fetch.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
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

    const result = client.invoices.getStatus({ invoiceId: "invoice-42" });
    result.catch(() => undefined);
    await vi.advanceTimersByTimeAsync(100);

    await expect(result).resolves.toEqual(invoiceStatusFixture);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("validates request input before Fetch", async () => {
    const fetch = createFetchSequence([jsonResponse(newInvoiceFixture)]);
    const client = new MonobankAcquiringClient({ fetch, token: "token" });

    await expect(
      client.invoices.create({ amount: 4.2 }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends every documented redirect and display field on the wire", async () => {
    const fetch = createFetchSequence([
      jsonResponse({
        appUrl: "monobank://pay/invoice-42",
        invoiceId: "invoice-42",
        pageUrl: "https://pay.example.test/invoice-42",
      }),
    ]);
    const client = new MonobankAcquiringClient({ fetch, token: "token" });

    const invoice = await client.invoices.create({
      amount: 4_200,
      displayType: InvoiceDisplayType.Iframe,
      failUrl: "https://example.test/failed",
      successUrl: "https://example.test/succeeded",
      withAppUrl: true,
    });

    expect(firstRequestBody(fetch)).toEqual({
      amount: 4_200,
      displayType: "iframe",
      failUrl: "https://example.test/failed",
      successUrl: "https://example.test/succeeded",
      withAppUrl: true,
    });
    expect(invoice.appUrl).toBe("monobank://pay/invoice-42");
  });

  it("rejects a malformed successful response", async () => {
    const fetch = createFetchSequence([jsonResponse({ invoiceId: 42 })]);
    const client = new MonobankAcquiringClient({ fetch, token: "token" });

    await expect(
      client.invoices.create({ amount: 4_200 }),
    ).rejects.toBeInstanceOf(MonobankResponseValidationError);
  });
});
