import type { RequestOptions } from "../../shared/request-options.js";
import { requestSignal } from "../../shared/request-options.js";
import type { MonobankTransport } from "../../transport/transport.js";
import type {
  GetStatementsInput,
  UnixTimeInput,
} from "./get-statements/get-statements.js";
import { createStatementsEndpoint } from "./get-statements/get-statements.js";
import type { StatementItem } from "./models/statement-item.js";
import { statementItemsSchema } from "./models/statement-item.js";

/** Authenticated Personal account and jar statement operations. */
export class MonobankPersonalStatements {
  private readonly transport: MonobankTransport;

  /**
   * Creates the statements resource over the parent client's authenticated transport.
   * @param transport Shared Personal transport owned by `MonobankPersonalClient`.
   */
  public constructor(transport: MonobankTransport) {
    this.transport = transport;
  }

  /**
   * Loads account or jar statements for an explicit Monobank time window.
   *
   * `Date` inputs are normalized to Unix seconds; numeric inputs must already
   * be finite nonnegative Unix-second integers. The statement window is not
   * split or delayed by the SDK: Monobank's inclusive maximum is 2,682,000
   * seconds, and this endpoint is limited to one request per 60 seconds. This
   * authenticated safe GET is retried only when a bounded retry policy is
   * supplied to the parent. A provided `RequestOptions.signal` cancels the
   * active Fetch attempt and any retry delay.
   * @example
   * ```ts
   * const statements = await client.statements.get({
   *   account: "0",
   *   from: new Date("2026-08-01T00:00:00.000Z"),
   *   to: new Date("2026-08-02T00:00:00.000Z"),
   * });
   * ```
   * @param input Account or jar identifier plus statement window.
   * @param options Optional cancellation controls for this request.
   * @returns Validated statement items with monetary values in minor currency units.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the statement schema.
   * @throws {MonobankValidationError} When account or time-window input is invalid before Fetch runs.
   */
  public async get(
    input: GetStatementsInput,
    options?: RequestOptions,
  ): Promise<readonly StatementItem[]> {
    return await this.transport.getJson({
      auth: true,
      endpoint: createStatementsEndpoint(createStatementRequestInput(input)),
      retryable: true,
      schema: statementItemsSchema,
      ...requestSignal(options),
    });
  }
}

function createStatementRequestInput(
  input: GetStatementsInput,
): GetStatementsInput {
  const from: UnixTimeInput = input.from;

  if (input.to === undefined) {
    return {
      ...(input.account === undefined ? {} : { account: input.account }),
      from,
    };
  }

  const to: UnixTimeInput = input.to;

  return {
    ...(input.account === undefined ? {} : { account: input.account }),
    from,
    to,
  };
}
