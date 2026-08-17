import type { RequestOptions } from "../../shared/request-options.js";
import type { MonobankTransport } from "../../transport/transport.js";
import type { GetAcquiringStatementsInput } from "./get-statements/get-acquiring-statements.js";
import { createAcquiringStatementsEndpoint } from "./get-statements/get-acquiring-statements.js";
import type { AcquiringStatement } from "./models/acquiring-statement.js";
import { acquiringStatementSchema } from "./models/acquiring-statement.js";

/** Authenticated Acquiring transaction statement operations. */
export class MonobankAcquiringStatements {
  private readonly transport: MonobankTransport;

  /**
   * Creates the statements resource over the parent client's authenticated transport.
   * @param transport Shared Acquiring transport owned by `MonobankAcquiringClient`.
   */
  public constructor(transport: MonobankTransport) {
    this.transport = transport;
  }

  /**
   * Loads Acquiring transactions for a time window and optional submerchant terminal.
   *
   * `Date` inputs are normalized to Unix seconds. This safe authenticated GET
   * is retried only when the parent client has a bounded retry policy. A
   * provided `RequestOptions.signal` cancels the active attempt or retry delay.
   * @example
   * ```ts
   * const statement = await client.statements.get({
   *   from: new Date("2026-08-01T00:00:00Z"),
   *   to: new Date("2026-08-16T00:00:00Z"),
   * });
   * ```
   * @param input Statement time window and optional terminal identifier.
   * @param options Optional cancellation controls for this request.
   * @returns Validated Acquiring statement response ordered newest first.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the statement schema.
   * @throws {MonobankValidationError} When timestamps or the optional terminal code are invalid, rejected before Fetch runs.
   */
  public async get(
    input: GetAcquiringStatementsInput,
    options?: RequestOptions,
  ): Promise<AcquiringStatement> {
    const endpoint = createAcquiringStatementsEndpoint(input);

    return await this.transport.getJson({
      auth: true,
      endpoint,
      retryable: true,
      schema: acquiringStatementSchema,
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
  }
}
