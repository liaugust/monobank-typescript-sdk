import type { FetchLike } from "../../transport/fetch-like.js";
import type { RetryOptions } from "../../transport/retry-options.js";

/** Configuration for the Acquiring client and its shared Fetch transport. */
export interface MonobankAcquiringClientOptions {
  /** Absolute HTTP(S) Monobank API origin, primarily for tests and controlled proxies. */
  readonly baseUrl?: string;
  /** Fetch-compatible implementation used for every Acquiring request. */
  readonly fetch?: FetchLike;
  /** Optional bounded retry policy; when omitted, endpoint methods make one attempt. */
  readonly retry?: RetryOptions;
  /** Per-attempt timeout in milliseconds before a request is classified as timed out. */
  readonly timeoutMs?: number;
  /** Acquiring token used for authenticated `/api/merchant/*` endpoints. */
  readonly token: string;
}
