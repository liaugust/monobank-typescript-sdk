import { describe, expect, it } from "vitest";

import { acquiringPosCancellationFixture } from "../../../tests/fixtures/acquiring/small-groups.js";
import { createAcquiringTestClient } from "../../../tests/support/acquiring-client.js";
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

describe("MonobankAcquiringPos", () => {
  it("initiates a POS refund against the original RRN", async () => {
    const fetch = createFetchSequence([
      jsonResponse(acquiringPosCancellationFixture),
    ]);

    await expect(
      createAcquiringTestClient(fetch).pos.cancelTransaction({
        amount: 4_200,
        rrn: "060189181768",
      }),
    ).resolves.toEqual(acquiringPosCancellationFixture);
    expect(firstRequestUrl(fetch).href).toBe(
      "https://api.monobank.ua/api/merchant/pos-transaction-cancel",
    );
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("POST");
    expect(firstRequestHeaders(fetch).get("X-Token")).toBe("acquiring-token");
    expect(firstRequestBody(fetch)).toEqual({
      amount: 4_200,
      rrn: "060189181768",
    });
  });

  it("accepts an acknowledgement without a transaction identifier", async () => {
    const fetch = createFetchSequence([jsonResponse({ status: "ok" })]);

    await expect(
      createAcquiringTestClient(fetch).pos.cancelTransaction({
        amount: 1,
        rrn: "060189181768",
      }),
    ).resolves.toEqual({ status: "ok" });
  });

  it("rejects an acknowledgement without a status", async () => {
    const fetch = createFetchSequence([
      jsonResponse({ tranId: "acq123456789" }),
    ]);

    await expect(
      createAcquiringTestClient(fetch).pos.cancelTransaction({
        amount: 4_200,
        rrn: "060189181768",
      }),
    ).rejects.toBeInstanceOf(MonobankResponseValidationError);
  });

  it("rejects invalid refund input before Fetch", async () => {
    const fetch = createFetchSequence([]);
    const client = createAcquiringTestClient(fetch);

    await expect(
      client.pos.cancelTransaction({ amount: 0, rrn: "060189181768" }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    await expect(
      client.pos.cancelTransaction({ amount: 42.5, rrn: "060189181768" }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    await expect(
      client.pos.cancelTransaction({ amount: 4_200, rrn: " " }),
    ).rejects.toBeInstanceOf(MonobankValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("cancels the refund request through the caller's signal", async () => {
    await expectCallerCancellation((client, signal) =>
      client.pos.cancelTransaction(
        { amount: 4_200, rrn: "060189181768" },
        { signal },
      ),
    );
  });
});
