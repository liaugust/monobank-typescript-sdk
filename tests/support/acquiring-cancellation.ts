import { expect } from "vitest";

import { MonobankAcquiringClient } from "../../src/acquiring/client/monobank-acquiring-client.js";
import { createAbortableFetch } from "./create-abortable-fetch.js";

export type AcquiringCall = (
  client: MonobankAcquiringClient,
  signal: AbortSignal,
) => Promise<unknown>;

export async function expectCallerCancellation(
  start: AcquiringCall,
): Promise<void> {
  const { entered, fetch, requestSignal } = createAbortableFetch();
  const client = new MonobankAcquiringClient({
    fetch,
    token: "acquiring-token",
  });
  const controller = new AbortController();

  const request = start(client, controller.signal);
  request.catch(() => undefined);
  await entered;
  controller.abort();

  expect(requestSignal()?.aborted).toBe(true);
  await expect(request).rejects.toMatchObject({ reason: "aborted" });
}
