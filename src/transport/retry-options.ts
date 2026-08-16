/**
 * Bounded retry policy accepted by the transport for safe idempotent requests.
 *
 * Retries are disabled when this option is omitted. Task 3 validates and stores
 * the policy only; attempt scheduling, cancellation, and timeout orchestration
 * are implemented by the reliability task.
 */
export interface RetryOptions {
  /** Initial retry delay in milliseconds before any later backoff is applied. */
  readonly baseDelayMs: number;
  /** Maximum number of request attempts including the first call. */
  readonly maxAttempts: number;
  /** Upper bound in milliseconds for any computed retry delay. */
  readonly maxDelayMs: number;
}
