import { describe, expect, it } from "vitest";

import {
  acquiringSubscriptionFixture,
  acquiringSubscriptionListFixture,
  acquiringSubscriptionPaymentListFixture,
  newAcquiringSubscriptionFixture,
} from "../../../tests/fixtures/acquiring/subscriptions.js";
import { expectCallerCancellation } from "../../../tests/support/caller-cancellation.js";
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
import { AcquiringSubscriptionAction } from "./edit-subscription/edit-subscription.js";
import { AcquiringSubscriptionStatus } from "./models/acquiring-subscription.js";

function createClient(fetch: ReturnType<typeof createFetchSequence>) {
  return new MonobankAcquiringClient({ fetch, token: "acquiring-token" });
}

const dateFrom = "2024-06-01T00:00:00Z";

describe("MonobankAcquiringSubscriptions", () => {
  it("creates a subscription and returns its first payment page", async () => {
    const fetch = createFetchSequence([
      jsonResponse(newAcquiringSubscriptionFixture),
    ]);
    const client = createClient(fetch);

    await expect(
      client.subscriptions.create({
        amount: 4_200,
        ccy: 980,
        interval: "1m",
        redirectUrl: "https://example.test/result",
        validity: 3_600,
        webHookUrls: {
          chargeUrl: "https://example.test/charge",
          statusUrl: "https://example.test/status",
        },
      }),
    ).resolves.toEqual(newAcquiringSubscriptionFixture);
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/api/merchant/subscription/create",
    );
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(firstRequestHeaders(fetch).get("X-Token")).toBe("acquiring-token");
    expect(firstRequestBody(fetch)).toEqual({
      amount: 4_200,
      ccy: 980,
      interval: "1m",
      redirectUrl: "https://example.test/result",
      validity: 3_600,
      webHookUrls: {
        chargeUrl: "https://example.test/charge",
        statusUrl: "https://example.test/status",
      },
    });
  });

  it("accepts every documented interval unit", async () => {
    for (const interval of ["1d", "2w", "1m", "1y", "12m"]) {
      const fetch = createFetchSequence([
        jsonResponse(newAcquiringSubscriptionFixture),
      ]);

      await expect(
        createClient(fetch).subscriptions.create({ amount: 4_200, interval }),
      ).resolves.toEqual(newAcquiringSubscriptionFixture);
      expect(firstRequestBody(fetch)).toEqual({ amount: 4_200, interval });
    }
  });

  it("rejects an interval Monobank does not document before Fetch", async () => {
    const fetch = createFetchSequence([]);

    for (const interval of ["", "1", "d", "0d", "1h", "1 m", "1M"]) {
      await expect(
        createClient(fetch).subscriptions.create({ amount: 4_200, interval }),
      ).rejects.toBeInstanceOf(MonobankValidationError);
    }

    expect(fetch).not.toHaveBeenCalled();
  });

  it("loads the state of one subscription", async () => {
    const fetch = createFetchSequence([
      jsonResponse(acquiringSubscriptionFixture),
    ]);

    await expect(
      createClient(fetch).subscriptions.getStatus({
        subscriptionId: "s2_AbrCdXyZ13",
      }),
    ).resolves.toEqual(acquiringSubscriptionFixture);
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/api/merchant/subscription/status?subscriptionId=s2_AbrCdXyZ13",
    );
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("GET");
  });

  it("accepts a subscription state carrying only the documented minimum", async () => {
    const fetch = createFetchSequence([
      jsonResponse({ status: "cancelled", subscriptionId: "s2_AbrCdXyZ13" }),
    ]);

    await expect(
      createClient(fetch).subscriptions.getStatus({
        subscriptionId: "s2_AbrCdXyZ13",
      }),
    ).resolves.toEqual({
      status: "cancelled",
      subscriptionId: "s2_AbrCdXyZ13",
    });
  });

  it("rejects a subscription state without an identifier", async () => {
    const fetch = createFetchSequence([jsonResponse({ status: "active" })]);

    await expect(
      createClient(fetch).subscriptions.getStatus({
        subscriptionId: "s2_AbrCdXyZ13",
      }),
    ).rejects.toBeInstanceOf(MonobankResponseValidationError);
  });

  it("lists subscriptions and encodes the lifecycle filter", async () => {
    const fetch = createFetchSequence([
      jsonResponse(acquiringSubscriptionListFixture),
    ]);

    await expect(
      createClient(fetch).subscriptions.list({
        dateFrom,
        limit: 20,
        page: 1,
        status: AcquiringSubscriptionStatus.Active,
      }),
    ).resolves.toEqual(acquiringSubscriptionListFixture);
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/api/merchant/subscription/list?dateFrom=2024-06-01T00%3A00%3A00Z&limit=20&page=1&status=active",
    );
  });

  it("lists subscriptions without a filter when none is given", async () => {
    const fetch = createFetchSequence([
      jsonResponse(acquiringSubscriptionListFixture),
    ]);

    await createClient(fetch).subscriptions.list({ dateFrom });

    expect(firstRequestUrl(fetch).search).toBe(
      "?dateFrom=2024-06-01T00%3A00%3A00Z",
    );
  });

  it("accepts a subscription page without paging counters", async () => {
    const fetch = createFetchSequence([jsonResponse({ list: [] })]);

    await expect(
      createClient(fetch).subscriptions.list({ dateFrom }),
    ).resolves.toEqual({ list: [] });
  });

  it("rejects an undocumented lifecycle filter before Fetch", async () => {
    const fetch = createFetchSequence([]);

    await expect(
      createClient(fetch).subscriptions.list({
        dateFrom,
        status: "paused" as unknown as AcquiringSubscriptionStatus,
      }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reads the charge history of one subscription", async () => {
    const fetch = createFetchSequence([
      jsonResponse(acquiringSubscriptionPaymentListFixture),
    ]);

    await expect(
      createClient(fetch).subscriptions.getPayments({
        dateFrom,
        subscriptionId: "s2_AbrCdXyZ13",
      }),
    ).resolves.toEqual(acquiringSubscriptionPaymentListFixture);
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/api/merchant/subscription/payments?dateFrom=2024-06-01T00%3A00%3A00Z&subscriptionId=s2_AbrCdXyZ13",
    );
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("GET");
  });

  it("rejects a charge history request for a blank subscription", async () => {
    const fetch = createFetchSequence([]);

    await expect(
      createClient(fetch).subscriptions.getPayments({
        dateFrom,
        subscriptionId: "  ",
      }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("cancels a subscription with an optional refund", async () => {
    const fetch = createFetchSequence([new Response(null, { status: 200 })]);

    await expect(
      createClient(fetch).subscriptions.edit({
        action: AcquiringSubscriptionAction.Cancel,
        refundAmount: 4_200,
        subscriptionId: "s2_AbrCdXyZ13",
      }),
    ).resolves.toBeUndefined();
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/api/merchant/subscription/edit",
    );
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(firstRequestBody(fetch)).toEqual({
      action: "cancel",
      refundAmount: 4_200,
      subscriptionId: "s2_AbrCdXyZ13",
    });
  });

  it("rejects an undocumented subscription action before Fetch", async () => {
    const fetch = createFetchSequence([]);

    await expect(
      createClient(fetch).subscriptions.edit({
        action: "pause" as unknown as AcquiringSubscriptionAction,
        subscriptionId: "s2_AbrCdXyZ13",
      }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects an edit whose subscription identifier is blank", async () => {
    const fetch = createFetchSequence([]);

    await expect(
      createClient(fetch).subscriptions.edit({
        action: AcquiringSubscriptionAction.Cancel,
        subscriptionId: " s2_AbrCdXyZ13",
      }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("deactivates a subscription", async () => {
    const fetch = createFetchSequence([new Response(null, { status: 200 })]);

    await expect(
      createClient(fetch).subscriptions.remove({
        subscriptionId: "s2_AbrCdXyZ13",
      }),
    ).resolves.toBeUndefined();
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/api/merchant/subscription/remove",
    );
    expect(firstRequestBody(fetch)).toEqual({
      subscriptionId: "s2_AbrCdXyZ13",
    });
  });

  it("rejects a deactivation without an identifier", async () => {
    const fetch = createFetchSequence([]);

    await expect(
      createClient(fetch).subscriptions.remove(
        {} as unknown as { subscriptionId: string },
      ),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("cancels each subscription request through the caller's signal", async () => {
    await expectCallerCancellation((client, signal) =>
      client.subscriptions.create(
        { amount: 4_200, interval: "1m" },
        { signal },
      ),
    );
    await expectCallerCancellation((client, signal) =>
      client.subscriptions.getStatus(
        { subscriptionId: "s2_AbrCdXyZ13" },
        { signal },
      ),
    );
    await expectCallerCancellation((client, signal) =>
      client.subscriptions.list({ dateFrom }, { signal }),
    );
    await expectCallerCancellation((client, signal) =>
      client.subscriptions.getPayments(
        { dateFrom, subscriptionId: "s2_AbrCdXyZ13" },
        { signal },
      ),
    );
    await expectCallerCancellation((client, signal) =>
      client.subscriptions.edit(
        {
          action: AcquiringSubscriptionAction.Cancel,
          subscriptionId: "s2_AbrCdXyZ13",
        },
        { signal },
      ),
    );
    await expectCallerCancellation((client, signal) =>
      client.subscriptions.remove(
        { subscriptionId: "s2_AbrCdXyZ13" },
        { signal },
      ),
    );
  });
});
