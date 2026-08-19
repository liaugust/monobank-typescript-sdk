import { MonobankAcquiringClient } from "../../src/acquiring/client/monobank-acquiring-client.js";
import type { FetchLike } from "../../src/transport/fetch-like.js";

export function createAcquiringTestClient(
  fetch: FetchLike,
): MonobankAcquiringClient {
  return new MonobankAcquiringClient({ fetch, token: "acquiring-token" });
}
