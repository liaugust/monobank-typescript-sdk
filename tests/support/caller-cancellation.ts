import { expect } from "vitest";

import { MonobankAcquiringClient } from "../../src/acquiring/client/monobank-acquiring-client.js";
import { MonobankCorporateClient } from "../../src/corporate/client/monobank-corporate-client.js";
import { MonobankInstallmentsClient } from "../../src/installments/client/monobank-installments-client.js";
import type { FetchLike } from "../../src/transport/fetch-like.js";
import { createAbortableFetch } from "./create-abortable-fetch.js";

export type CancellableCall<TClient> = (
  client: TClient,
  signal: AbortSignal,
) => Promise<unknown>;

async function expectClientCancellation<TClient>(
  createClient: (fetch: FetchLike) => TClient,
  start: CancellableCall<TClient>,
): Promise<void> {
  const { entered, fetch, requestSignal } = createAbortableFetch();
  const client = createClient(fetch);
  const controller = new AbortController();

  const request = start(client, controller.signal);
  request.catch(() => undefined);
  await entered;
  controller.abort();

  expect(requestSignal()?.aborted).toBe(true);
  await expect(request).rejects.toMatchObject({ reason: "aborted" });
}

export async function expectCallerCancellation(
  start: CancellableCall<MonobankAcquiringClient>,
): Promise<void> {
  await expectClientCancellation(
    (fetch) => new MonobankAcquiringClient({ fetch, token: "acquiring-token" }),
    start,
  );
}

export async function expectCorporateCancellation(
  start: CancellableCall<MonobankCorporateClient>,
): Promise<void> {
  await expectClientCancellation(
    (fetch) =>
      new MonobankCorporateClient({
        fetch,
        keyId: "corporate-key-id",
        sign: () => "c2ln",
      }),
    start,
  );
}

export async function expectInstallmentsCancellation(
  start: CancellableCall<MonobankInstallmentsClient>,
): Promise<void> {
  await expectClientCancellation(
    (fetch) =>
      new MonobankInstallmentsClient({
        fetch,
        storeId: "test_store_with_confirm",
        storeSecret: "secret_98765432--123-123",
      }),
    start,
  );
}
