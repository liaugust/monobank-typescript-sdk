/** Options used to describe invalid SDK configuration or method input. */
export interface MonobankValidationErrorOptions {
  /** Endpoint or SDK operation whose input failed validation. */
  readonly endpoint?: string;
  /** Safe human-readable input issues suitable for application logs. */
  readonly issues: readonly string[];
  /** Diagnostic summary safe to show in application logs. */
  readonly message: string;
}

/** Error thrown before a request when SDK configuration or method input is invalid. */
export class MonobankValidationError extends Error {
  /** Endpoint or SDK operation whose input failed validation. */
  public readonly endpoint?: string;

  /** Safe human-readable input issues suitable for application logs. */
  public readonly issues: readonly string[];

  /** Stable public error name for narrowing caught SDK failures. */
  public override readonly name = "MonobankValidationError";

  /**
   * Builds a validation error from safe SDK input diagnostics.
   * @param options Safe validation details produced before any network request.
   */
  public constructor(options: MonobankValidationErrorOptions) {
    super(options.message);
    this.issues = [...options.issues];

    if (options.endpoint !== undefined) {
      this.endpoint = options.endpoint;
    }
  }
}
