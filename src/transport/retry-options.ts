/** Status codes retried by default when a policy is configured. */
export const defaultRetryableStatusCodes: readonly number[] = [
  429, 500, 502, 503, 504,
];

/**
 * Bounded retry policy accepted by the transport for safe idempotent requests.
 *
 * Retries are disabled when this option is omitted, and only safe GET requests
 * are ever retried: mutating methods are excluded structurally, not by
 * configuration.
 *
 * Timeouts are never retried, whatever the policy. A configured `timeoutMs` is
 * the caller's stated ceiling for one attempt, so exceeding it fails the request
 * rather than spending the budget again.
 */
export interface RetryOptions {
  /** Initial retry delay in milliseconds before any later backoff is applied. */
  readonly baseDelayMs: number;
  /** Maximum number of request attempts including the first call. */
  readonly maxAttempts: number;
  /** Upper bound in milliseconds for any computed retry delay. */
  readonly maxDelayMs: number;
  /**
   * Response statuses eligible for retry; defaults to
   * `defaultRetryableStatusCodes`.
   *
   * Narrow this when a retry cannot help. Monobank documents
   * `/personal/client-info` and `/personal/statement` at one request per 60
   * seconds, so a `429` there means the minute's quota is already spent and a
   * short backoff only spends more of it: pass `[500, 502, 503, 504]` for a
   * Personal client that paces itself.
   */
  readonly retryableStatusCodes?: readonly number[];
}
