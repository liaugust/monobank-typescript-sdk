/** Options used to describe a non-success response from the Monobank API. */
export interface MonobankApiErrorOptions {
  /** Endpoint path being called when the upstream API rejected the request. */
  readonly endpoint: string;
  /** Credential-safe response headers copied from the upstream response. */
  readonly headers: Readonly<Record<string, string>>;
  /** Diagnostic summary safe to show in application logs. */
  readonly message: string;
  /** Retry delay derived from Retry-After, expressed in milliseconds. */
  readonly retryAfterMs?: number;
  /** HTTP status returned by Monobank or an intermediary. */
  readonly status: number;
  /** Normalized upstream error text, when the response body supplied one safely. */
  readonly upstreamMessage?: string;
}

/** Error thrown when Monobank returns a non-2xx HTTP response. */
export class MonobankApiError extends Error {
  /** Endpoint path being called when the upstream API rejected the request. */
  public readonly endpoint: string;

  /** Credential-safe response headers copied from the upstream response. */
  public readonly headers: Readonly<Record<string, string>>;

  /** Stable public error name for narrowing caught SDK failures. */
  public override readonly name = "MonobankApiError";

  /** Retry delay derived from Retry-After, expressed in milliseconds. */
  public readonly retryAfterMs?: number;

  /** HTTP status returned by Monobank or an intermediary. */
  public readonly status: number;

  /** Normalized upstream error text, when the response body supplied one safely. */
  public readonly upstreamMessage?: string;

  /**
   * Builds a credential-safe API error from normalized HTTP response metadata.
   * @param options Safe upstream failure details prepared by the transport.
   */
  public constructor(options: MonobankApiErrorOptions) {
    super(options.message);
    this.endpoint = options.endpoint;
    this.headers = copySafeHeaders(options.headers);
    this.status = options.status;

    if (options.retryAfterMs !== undefined) {
      this.retryAfterMs = options.retryAfterMs;
    }

    if (options.upstreamMessage !== undefined) {
      this.upstreamMessage = options.upstreamMessage;
    }
  }
}

function copySafeHeaders(
  headers: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    Object.entries(headers).filter(
      ([name]) =>
        !name.toLowerCase().includes("token") &&
        name.toLowerCase() !== "authorization",
    ),
  );
}
