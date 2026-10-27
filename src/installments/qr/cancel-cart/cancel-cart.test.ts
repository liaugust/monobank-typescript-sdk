import { expect, it } from "vitest";

import { expectInstallmentsCancellation } from "../../../../tests/support/caller-cancellation.js";
import { createFetchSequence } from "../../../../tests/support/create-fetch-sequence.js";
import { createInstallmentsTestClient } from "../../../../tests/support/installments-client.js";
import { expectSignedInstallmentsRequest } from "../../../../tests/support/installments-request.js";
import { MonobankApiError } from "../../../errors/monobank-api-error.js";
import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import { MonobankInstallmentsClient } from "../../client/monobank-installments-client.js";
const input = { qr_id: "qr-42" };
it("cancels a signed QR cart with exact wire units", async () => {
  const fetch = createFetchSequence([new Response(null, { status: 200 })]);
  await expect(
    createInstallmentsTestClient(fetch).qr.cancelCart(input),
  ).resolves.toEqual(undefined);
  expectSignedInstallmentsRequest(fetch, input, "/api/v1/qr/cart/cancel");
});
it("validates QR cart input before Fetch", async () => {
  const fetch = createFetchSequence([]);
  await expect(
    createInstallmentsTestClient(fetch).qr.cancelCart({ ...input, qr_id: "" }),
  ).rejects.toBeInstanceOf(MonobankValidationError);
  expect(fetch).not.toHaveBeenCalled();
});
it("aborts QR cart cancel", async () => {
  await expectInstallmentsCancellation((client, signal) =>
    client.qr.cancelCart(input, { signal }),
  );
});

it("never retries QR cancellation with a configured retry policy", async () => {
  const fetch = createFetchSequence([new Response(null, { status: 503 })]);
  const client = new MonobankInstallmentsClient({
    fetch,
    storeId: "store-42",
    storeSecret: "secret-42",
    retry: { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 1 },
  });
  await expect(client.qr.cancelCart(input)).rejects.toBeInstanceOf(
    MonobankApiError,
  );
  expect(fetch).toHaveBeenCalledTimes(1);
});
