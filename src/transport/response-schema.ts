/** Safe schema issue shape retained after response validation fails. */
export interface ResponseValidationIssue {
  /** Validator-specific issue code without retaining the raw parser error. */
  readonly code: string;
  /** Safe validation message suitable for application diagnostics. */
  readonly message: string;
  /** Property path pointing at the invalid response value. */
  readonly path: readonly PropertyKey[];
}

/** Structural parser contract used by the transport without depending on a schema library. */
export interface ResponseSchema<T> {
  /**
   * Validates an unknown upstream payload and returns either parsed data or safe issues.
   *
   * @param input Unknown decoded response payload crossing the network boundary.
   * @returns Parsed data on success, or safe validation issues on failure.
   */
  safeParse(input: unknown):
    | { readonly success: true; readonly data: T }
    | {
        readonly success: false;
        readonly error: {
          readonly issues: readonly ResponseValidationIssue[];
        };
      };
}
