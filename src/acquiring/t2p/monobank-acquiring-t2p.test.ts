import { describe, expect, it } from "vitest";

import {
  acquiringT2pPaymentFixture,
  acquiringT2pTerminalListFixture,
} from "../../../tests/fixtures/acquiring/small-groups.js";
import { createAcquiringTestClient } from "../../../tests/support/acquiring-client.js";
import { expectCallerCancellation } from "../../../tests/support/caller-cancellation.js";
import {
  createFetchSequence,
  jsonResponse,
} from "../../../tests/support/create-fetch-sequence.js";
import {
  firstRequestHeaders,
  firstRequestUrl,
} from "../../../tests/support/fetch-request-inspection.js";
import { MonobankResponseValidationError } from "../../errors/monobank-response-validation-error.js";
import { MonobankValidationError } from "../../errors/monobank-validation-error.js";

describe("MonobankAcquiringT2p", () => {
  it("lists the merchant's terminals", async () => {
    const fetch = createFetchSequence([
      jsonResponse(acquiringT2pTerminalListFixture),
    ]);

    await expect(
      createAcquiringTestClient(fetch).t2p.listTerminals(),
    ).resolves.toEqual(acquiringT2pTerminalListFixture);
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/api/merchant/t2p/terminal/list",
    );
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("GET");
    expect(firstRequestHeaders(fetch).get("X-Token")).toBe("acquiring-token");
  });

  it("rejects a terminal entry without its terminal identifier", async () => {
    const fetch = createFetchSequence([
      jsonResponse({ list: [{ name: "Cats n Cash inc." }] }),
    ]);

    await expect(
      createAcquiringTestClient(fetch).t2p.listTerminals(),
    ).rejects.toBeInstanceOf(MonobankResponseValidationError);
  });

  it("loads one payment and preserves its divergent field shapes", async () => {
    const fetch = createFetchSequence([
      jsonResponse(acquiringT2pPaymentFixture),
    ]);

    const payment = await createAcquiringTestClient(fetch).t2p.getPaymentStatus(
      {
        externalPaymentId: "18247112-4eac-4465-aa3c-c42c18f601eb",
      },
    );

    expect(payment).toEqual(acquiringT2pPaymentFixture);
    expect(payment.ccy).toBe("UAH");
    expect(payment.dataTime).toBe("2026-04-21 23:01:54");
    expect(payment.errorMessage).toBeNull();
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/api/merchant/t2p/terminal/payment/external/status?externalPaymentId=18247112-4eac-4465-aa3c-c42c18f601eb",
    );
  });

  it("encodes an identifier needing escaping", async () => {
    const fetch = createFetchSequence([
      jsonResponse(acquiringT2pPaymentFixture),
    ]);

    await createAcquiringTestClient(fetch).t2p.getPaymentStatus({
      externalPaymentId: "order/42 +1",
    });

    expect(firstRequestUrl(fetch).search).toBe(
      "?externalPaymentId=order%2F42+%2B1",
    );
  });

  it("accepts a payment carrying only its status", async () => {
    const fetch = createFetchSequence([jsonResponse({ status: "processing" })]);

    await expect(
      createAcquiringTestClient(fetch).t2p.getPaymentStatus({
        externalPaymentId: "payment-42",
      }),
    ).resolves.toEqual({ status: "processing" });
  });

  it("rejects a blank external payment identifier before Fetch", async () => {
    const fetch = createFetchSequence([]);

    await expect(
      createAcquiringTestClient(fetch).t2p.getPaymentStatus({
        externalPaymentId: " ",
      }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("cancels each tap-to-phone request through the caller's signal", async () => {
    await expectCallerCancellation((client, signal) =>
      client.t2p.listTerminals({ signal }),
    );
    await expectCallerCancellation((client, signal) =>
      client.t2p.getPaymentStatus(
        { externalPaymentId: "payment-42" },
        { signal },
      ),
    );
  });
});
