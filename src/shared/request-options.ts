/** Optional controls shared by individual Monobank requests. */
export interface RequestOptions {
  /** Cancels the active Fetch attempt and any retry delay. */
  readonly signal?: AbortSignal;
}
