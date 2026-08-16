import type { createFetchSequence } from "./create-fetch-sequence.js";

type FetchSequence = ReturnType<typeof createFetchSequence>;

export function firstRequestBody(fetch: FetchSequence): unknown {
  const body = fetch.mock.calls[0]?.[1]?.body;

  if (typeof body !== "string") {
    throw new TypeError("Client should send a JSON string body");
  }

  return JSON.parse(body) as unknown;
}

export function firstRequestHeaders(fetch: FetchSequence): Headers {
  return new Headers(fetch.mock.calls[0]?.[1]?.headers);
}

export function firstRequestUrl(fetch: FetchSequence): URL {
  const [input] = fetch.mock.calls[0] ?? [];
  if (!(input instanceof URL)) {
    throw new TypeError("Client should call Fetch with a URL instance");
  }

  return input;
}
