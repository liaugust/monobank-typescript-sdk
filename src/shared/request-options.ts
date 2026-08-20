/** Optional controls shared by individual Monobank requests. */
export interface RequestOptions {
  /** Cancels the active Fetch attempt and any retry delay. */
  readonly signal?: AbortSignal;
}

/**
 * Spreads a caller-supplied `signal` into a transport request, omitting the
 * key entirely rather than passing an explicit `undefined`.
 * @param options Optional per-request controls.
 * @returns An object carrying `signal` only when one was supplied.
 */
export function requestSignal(options: RequestOptions | undefined): {
  readonly signal?: AbortSignal;
} {
  return options?.signal === undefined ? {} : { signal: options.signal };
}
