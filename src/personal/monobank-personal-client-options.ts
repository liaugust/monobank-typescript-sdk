import type { FetchLike } from "../transport/fetch-like.js";
import type { RetryOptions } from "../transport/retry-options.js";

/**
 * Configuration for the Personal client and its shared Fetch transport.
 */
export interface MonobankPersonalClientOptions {
  /** Absolute HTTP(S) Monobank API origin, primarily for tests and controlled proxies. */
  readonly baseUrl?: string;
  /** Fetch-compatible implementation used for every Personal and public bank request. */
  readonly fetch?: FetchLike;
  /** Optional bounded retry policy; when omitted, endpoint methods make one attempt. */
  readonly retry?: RetryOptions;
  /** Per-attempt timeout in milliseconds before a request is classified as timed out. */
  readonly timeoutMs?: number;
  /** Personal API token used only for authenticated `/personal/*` endpoint methods. */
  readonly token: string;
}
