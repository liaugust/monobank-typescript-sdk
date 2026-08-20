import type { FetchLike } from "../../transport/fetch-like.js";
import type { RetryOptions } from "../../transport/retry-options.js";

/** Configuration for `MonobankInstallmentsClient`. */
export interface MonobankInstallmentsClientOptions {
  /**
   * Absolute HTTP(S) origin for the Покупка Частинами API.
   *
   * Defaults to production, `https://u2.monobank.com.ua`. Monobank documents a
   * sandbox at `https://u2-demo-ext.mono.st4g3.com` and a stage environment at
   * `https://u2-ext.mono.st4g3.com`; unlike the other families, none of these is
   * `api.monobank.ua`.
   */
  readonly baseUrl?: string;
  /** Fetch implementation to use instead of `globalThis.fetch`. */
  readonly fetch?: FetchLike;
  /**
   * Bounded retry policy for safe reads; omit to disable retries.
   *
   * Покупка Частинами exposes only `POST` endpoints, and the transport's
   * retry policy only ever applies to safe `GET` requests, so this option has
   * no effect on any current `MonobankInstallmentsClient` request. It is
   * still validated and accepted for forward compatibility with a future safe
   * read endpoint.
   */
  readonly retry?: RetryOptions;
  /** Store identifier Monobank issued, sent as `store-id`. */
  readonly storeId: string;
  /** Shared secret each request body is signed with. */
  readonly storeSecret: string;
  /** Per-attempt timeout in milliseconds; defaults to 10,000. */
  readonly timeoutMs?: number;
}
