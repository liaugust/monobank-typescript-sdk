import { vi } from "vitest";

import type { FetchLike } from "../../src/transport/fetch-like.js";

export function createFetchSequence(results: readonly (Error | Response)[]) {
  const queue = [...results];

  return vi.fn<FetchLike>(() => {
    const result = queue.shift();
    if (result === undefined) {
      return Promise.reject(new Error("Fetch sequence exhausted"));
    }
    if (result instanceof Error) {
      return Promise.reject(result);
    }

    return Promise.resolve(result);
  });
}

export function jsonResponse(
  value: unknown,
  init: ResponseInit = {},
): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  return new Response(JSON.stringify(value), { ...init, headers });
}
