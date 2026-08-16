/**
 * Per-request controls shared by Personal endpoint methods.
 */
export interface RequestOptions {
  /** Abort signal forwarded to Fetch so callers can cancel network work and retry delays. */
  readonly signal?: AbortSignal;
}
