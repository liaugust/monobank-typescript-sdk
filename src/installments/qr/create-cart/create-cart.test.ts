import { expect, it } from "vitest";

import { expectInstallmentsCancellation } from "../../../../tests/support/caller-cancellation.js";
import {
  createFetchSequence,
  jsonResponse,
} from "../../../../tests/support/create-fetch-sequence.js";
import { createInstallmentsTestClient } from "../../../../tests/support/installments-client.js";
import { expectSignedInstallmentsRequest } from "../../../../tests/support/installments-request.js";
import { MonobankApiError } from "../../../errors/monobank-api-error.js";
import { MonobankResponseValidationError } from "../../../errors/monobank-response-validation-error.js";
import { MonobankValidationError } from "../../../errors/monobank-validation-error.js";
import { MonobankInstallmentsClient } from "../../client/monobank-installments-client.js";
const input = {
  qr_id: "qr-42",
  store_order_id: "fa4a8249-336e-4e6d-9b85-79bc8be62377",
  products: [{ name: "Chair", count: 2, sum: 2499.99 }],
  result_callback: "https://example.com/callback",
};
it("creates a signed QR cart with exact wire units", async () => {
  const fetch = createFetchSequence([
    jsonResponse({ id: input.store_order_id, future: true }, { status: 201 }),
  ]);
  await expect(
    createInstallmentsTestClient(fetch).qr.createCart(input),
  ).resolves.toEqual({ id: input.store_order_id, future: true });
  expectSignedInstallmentsRequest(fetch, input, "/api/v1/qr/cart");
});
it("validates QR cart input before Fetch", async () => {
  const fetch = createFetchSequence([]);
  await expect(
    createInstallmentsTestClient(fetch).qr.createCart({ ...input, qr_id: "" }),
  ).rejects.toBeInstanceOf(MonobankValidationError);
  expect(fetch).not.toHaveBeenCalled();
});
it("aborts QR cart create", async () => {
  await expectInstallmentsCancellation((client, signal) =>
    client.qr.createCart(input, { signal }),
  );
});

it.each([
  { products: [] },
  { store_order_id: "not-a-uuid" },
  { result_callback: "file:///tmp/callback" },
  { products: [{ name: "", count: 1, sum: 1 }] },
  { products: [{ name: "x".repeat(501), count: 1, sum: 1 }] },
  { products: [{ name: "Chair", count: 1.5, sum: 1 }] },
  { products: [{ name: "Chair", count: 0, sum: 1 }] },
  { products: [{ name: "Chair", count: 1, sum: 0 }] },
])("rejects malformed QR product or cart %j", async (fields) => {
  const fetch = createFetchSequence([]);
  await expect(
    createInstallmentsTestClient(fetch).qr.createCart({ ...input, ...fields }),
  ).rejects.toBeInstanceOf(MonobankValidationError);
  expect(fetch).not.toHaveBeenCalled();
});
it("accepts a QR response with no optional identifier", async () => {
  const fetch = createFetchSequence([jsonResponse({})]);
  await expect(
    createInstallmentsTestClient(fetch).qr.createCart(input),
  ).resolves.toEqual({});
});
it("rejects an invalid QR response UUID", async () => {
  const fetch = createFetchSequence([jsonResponse({ id: "invalid" })]);
  await expect(
    createInstallmentsTestClient(fetch).qr.createCart(input),
  ).rejects.toBeInstanceOf(MonobankResponseValidationError);
});
it("never retries QR creation with a configured retry policy", async () => {
  const fetch = createFetchSequence([jsonResponse({}, { status: 503 })]);
  const client = new MonobankInstallmentsClient({
    fetch,
    storeId: "store-42",
    storeSecret: "secret-42",
    retry: { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 1 },
  });
  await expect(client.qr.createCart(input)).rejects.toBeInstanceOf(
    MonobankApiError,
  );
  expect(fetch).toHaveBeenCalledTimes(1);
});
