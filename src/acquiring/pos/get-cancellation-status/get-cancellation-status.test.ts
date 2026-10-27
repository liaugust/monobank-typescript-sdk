import { expect, it } from "vitest";

import { createAcquiringTestClient } from "../../../../tests/support/acquiring-client.js";
import { expectCallerCancellation } from "../../../../tests/support/caller-cancellation.js";
import {
  createFetchSequence,
  jsonResponse,
} from "../../../../tests/support/create-fetch-sequence.js";
import {
  firstRequestHeaders,
  firstRequestUrl,
} from "../../../../tests/support/fetch-request-inspection.js";
import { MonobankResponseValidationError } from "../../../errors/monobank-response-validation-error.js";
import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import { MonobankAcquiringClient } from "../../client/monobank-acquiring-client.js";

it.each([
  {},
  {
    amount: 4200,
    cancelRef: "refund-42",
    createTime: "2026-10-27T10:00:00Z",
    modifyTime: "2026-10-27T11:00:00+03:00",
    originalTranId: "original-42",
    rrn: "000000000042",
    status: "success",
    future: true,
  },
])("loads a POS refund with optional fields %j", async (response) => {
  const fetch = createFetchSequence([jsonResponse(response)]);
  await expect(
    createAcquiringTestClient(fetch).pos.getCancellationStatus({
      cancelRef: "refund /42",
    }),
  ).resolves.toEqual(response);
  expect(firstRequestUrl(fetch).searchParams.get("cancelRef")).toBe(
    "refund /42",
  );
  expect(firstRequestUrl(fetch).pathname).toBe(
    "/api/merchant/pos-transaction-cancel/status",
  );
  expect(firstRequestHeaders(fetch).get("X-Token")).toBe("acquiring-token");
  expect(fetch.mock.calls[0]?.[1]?.method).toBe("GET");
});
it("validates refund reference before Fetch", async () => {
  const fetch = createFetchSequence([]);
  await expect(
    createAcquiringTestClient(fetch).pos.getCancellationStatus({
      cancelRef: "",
    }),
  ).rejects.toBeInstanceOf(MonobankValidationError);
  expect(fetch).not.toHaveBeenCalled();
});
it.each([
  { status: "unknown" },
  { amount: 1.5 },
  { createTime: "yesterday" },
  { modifyTime: "yesterday" },
])("rejects malformed POS refund response %j", async (response) => {
  const fetch = createFetchSequence([jsonResponse(response)]);
  await expect(
    createAcquiringTestClient(fetch).pos.getCancellationStatus({
      cancelRef: "refund-42",
    }),
  ).rejects.toBeInstanceOf(MonobankResponseValidationError);
});
it("aborts POS status lookup", async () => {
  await expectCallerCancellation((client, signal) =>
    client.pos.getCancellationStatus({ cancelRef: "refund-42" }, { signal }),
  );
});

it("retries safe POS lookup with a bounded policy", async () => {
  const fetch = createFetchSequence([
    jsonResponse({}, { status: 503 }),
    jsonResponse({ status: "processing" }),
  ]);
  const client = new MonobankAcquiringClient({
    fetch,
    token: "acquiring-token",
    retry: { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 1 },
  });
  await expect(
    client.pos.getCancellationStatus({ cancelRef: "refund-42" }),
  ).resolves.toEqual({ status: "processing" });
  expect(fetch).toHaveBeenCalledTimes(2);
});
it.each(["new", "processing", "success", "rejected", "reversed"])(
  "accepts POS lifecycle %s",
  async (status) => {
    const fetch = createFetchSequence([jsonResponse({ status })]);
    await expect(
      createAcquiringTestClient(fetch).pos.getCancellationStatus({
        cancelRef: "refund-42",
      }),
    ).resolves.toEqual({ status });
  },
);
