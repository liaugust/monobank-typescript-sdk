import type { RequestOptions } from "../../shared/request-options.js";
import { requestSignal } from "../../shared/request-options.js";
import type { MonobankTransport } from "../../transport/transport.js";
import { listAcquiringSplitReceiversEndpoint } from "./list-split-receivers/list-split-receivers.js";
import type { AcquiringSplitReceiverList } from "./models/split-receiver.js";
import { acquiringSplitReceiverListSchema } from "./models/split-receiver.js";

/** Split-payment receiver operations. */
export class MonobankAcquiringSplit {
  private readonly transport: MonobankTransport;

  /**
   * Creates the split resource over the parent client's authenticated transport.
   * @param transport Shared Acquiring transport owned by `MonobankAcquiringClient`.
   */
  public constructor(transport: MonobankTransport) {
    this.transport = transport;
  }

  /**
   * Lists the receivers a split payment can pay out to.
   *
   * A returned `splitReceiverId` is what
   * `CreateInvoiceInput.merchantPaymInfo.basketOrder[].splitReceiverId` expects.
   * Each entry carries the receiver's `edrpou` state registry code, which
   * identifies a real business, so treat the list as counterparty data rather
   * than public reference data. This safe authenticated GET is retried only when
   * the parent client has a bounded retry policy. A provided
   * `RequestOptions.signal` cancels the active attempt or retry delay.
   * @example
   * ```ts
   * const receivers = await client.split.listReceivers();
   * ```
   * @param options Optional cancellation controls for this request.
   * @returns Validated list of split-payment receivers.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the receiver-list schema.
   * @throws {MonobankValidationError} When request configuration is invalid before Fetch runs.
   */
  public listReceivers(
    options?: RequestOptions,
  ): Promise<AcquiringSplitReceiverList> {
    return this.transport.getJson({
      auth: true,
      endpoint: listAcquiringSplitReceiversEndpoint,
      retryable: true,
      schema: acquiringSplitReceiverListSchema,
      ...requestSignal(options),
    });
  }
}
