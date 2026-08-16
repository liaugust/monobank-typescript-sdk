/** Safe network failure categories exposed by the SDK transport boundary. */
export type MonobankNetworkErrorReason = "aborted" | "network" | "timeout";

/** Options used to describe a Fetch-level failure without retaining requests. */
export interface MonobankNetworkErrorOptions {
  /** Safe native error cause, when Fetch supplied one without request details. */
  readonly cause?: Error;
  /** Endpoint path being called when the request failed. */
  readonly endpoint: string;
  /** Diagnostic summary safe to show in application logs. */
  readonly message: string;
  /** Normalized reason applications can use for retry and cancellation handling. */
  readonly reason: MonobankNetworkErrorReason;
}

/** Error thrown when Fetch fails, times out, or is aborted before an HTTP response exists. */
export class MonobankNetworkError extends Error {
  /** Safe native error cause, when Fetch supplied one without request details. */
  public override readonly cause?: Error;

  /** Endpoint path being called when the request failed. */
  public readonly endpoint: string;

  /** Stable public error name for narrowing caught SDK failures. */
  public override readonly name = "MonobankNetworkError";

  /** Normalized reason applications can use for retry and cancellation handling. */
  public readonly reason: MonobankNetworkErrorReason;

  /**
   * Builds a network error with a bounded reason and optional safe cause.
   * @param options Safe request-failure details prepared by the transport.
   */
  public constructor(options: MonobankNetworkErrorOptions) {
    if (options.cause === undefined) {
      super(options.message);
    } else {
      super(options.message, { cause: options.cause });
      this.cause = options.cause;
    }

    this.endpoint = options.endpoint;
    this.reason = options.reason;
  }
}
