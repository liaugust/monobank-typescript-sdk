import type { RequestOptions } from "../../shared/request-options.js";
import type { MonobankTransport } from "../../transport/transport.js";
import type {
  AcquiringPosCancellation,
  CancelAcquiringPosTransactionInput,
} from "./cancel-pos-transaction/cancel-pos-transaction.js";
import {
  acquiringPosCancellationSchema,
  cancelAcquiringPosTransactionEndpoint,
  createCancelAcquiringPosTransactionBody,
} from "./cancel-pos-transaction/cancel-pos-transaction.js";

/** POS transaction refund operations. */
export class MonobankAcquiringPos {
  private readonly transport: MonobankTransport;

  /**
   * Creates the POS resource over the parent client's authenticated transport.
   * @param transport Shared Acquiring transport owned by `MonobankAcquiringClient`.
   */
  public constructor(transport: MonobankTransport) {
    this.transport = transport;
  }

  /**
   * Refunds part or all of a POS transaction, identified by its RRN.
   *
   * `amount` is in minor currency units and may not exceed what the original
   * transaction has left after earlier refunds; only Monobank can evaluate that,
   * so the SDK checks the shape and lets Monobank reject an over-refund. A
   * successful response acknowledges that the refund was *initiated*, not that
   * it settled. The request moves money and is therefore never retried, even
   * when the parent client has a retry policy; retrying a refund can refund
   * twice. A provided `RequestOptions.signal` cancels the active attempt.
   * @example
   * ```ts
   * const refund = await client.pos.cancelTransaction({
   *   amount: 4_200,
   *   rrn: "060189181768",
   * });
   * ```
   * @param input Original transaction RRN and refund amount.
   * @param options Optional cancellation controls for this request.
   * @returns Validated acknowledgement that the refund was initiated.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status, including an over-refund or unknown RRN.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the cancellation schema.
   * @throws {MonobankValidationError} When `rrn` is blank or `amount` is not a positive integer.
   */
  public async cancelTransaction(
    input: CancelAcquiringPosTransactionInput,
    options?: RequestOptions,
  ): Promise<AcquiringPosCancellation> {
    return await this.transport.postJson({
      auth: true,
      body: createCancelAcquiringPosTransactionBody(input),
      endpoint: cancelAcquiringPosTransactionEndpoint,
      retryable: false,
      schema: acquiringPosCancellationSchema,
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
  }
}
