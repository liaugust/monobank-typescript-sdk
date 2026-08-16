import type {
  ResponseSchema,
  ResponseValidationIssue,
} from "../transport/response-schema.js";

type ResponseSchemaFailure = Extract<
  ReturnType<ResponseSchema<unknown>["safeParse"]>,
  { readonly success: false }
>;

/** Options used to describe a successful response that failed runtime validation. */
export interface MonobankResponseValidationErrorOptions {
  /** Endpoint or parser context that produced the invalid successful payload. */
  readonly endpoint: string;
  /** Safe schema issues containing only code, path, and message details. */
  readonly issues: ResponseSchemaFailure["error"]["issues"];
  /** Diagnostic summary safe to show in application logs. */
  readonly message: string;
}

/** Error thrown when a successful Monobank response does not match its schema. */
export class MonobankResponseValidationError extends Error {
  /** Endpoint or parser context that produced the invalid successful payload. */
  public readonly endpoint: string;

  /** Safe schema issues containing only code, path, and message details. */
  public readonly issues: readonly ResponseValidationIssue[];

  /** Stable public error name for narrowing caught SDK failures. */
  public override readonly name = "MonobankResponseValidationError";

  /**
   * Builds a response-validation error without retaining the raw response or parser error.
   * @param options Safe validation details prepared from a schema result.
   */
  public constructor(options: MonobankResponseValidationErrorOptions) {
    super(options.message);
    this.endpoint = options.endpoint;
    this.issues = options.issues.map((issue) => ({
      code: issue.code,
      message: issue.message,
      path: [...issue.path],
    }));
  }
}
