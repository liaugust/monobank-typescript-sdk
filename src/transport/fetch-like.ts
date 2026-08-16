/**
 * Fetch-compatible function used by the SDK transport for HTTP requests.
 *
 * Consumers can inject this in tests, proxies, or runtimes that provide a
 * compatible Fetch implementation. The SDK does not polyfill Fetch; omitted
 * values fall back to the runtime's `globalThis.fetch`.
 */
export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;
