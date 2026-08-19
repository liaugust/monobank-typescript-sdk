import type { RequestOptions } from "../../shared/request-options.js";
import type { MonobankTransport } from "../../transport/transport.js";
import type { GetAcquiringT2pPaymentStatusInput } from "./get-t2p-payment-status/get-t2p-payment-status.js";
import { createAcquiringT2pPaymentStatusEndpoint } from "./get-t2p-payment-status/get-t2p-payment-status.js";
import { listAcquiringT2pTerminalsEndpoint } from "./list-t2p-terminals/list-t2p-terminals.js";
import type { AcquiringT2pPayment } from "./models/t2p-payment.js";
import { acquiringT2pPaymentSchema } from "./models/t2p-payment.js";
import type { AcquiringT2pTerminalList } from "./models/t2p-terminal.js";
import { acquiringT2pTerminalListSchema } from "./models/t2p-terminal.js";

/** Tap-to-phone terminal and payment-status operations. */
export class MonobankAcquiringT2p {
  private readonly transport: MonobankTransport;

  /**
   * Creates the tap-to-phone resource over the parent client's authenticated transport.
   * @param transport Shared Acquiring transport owned by `MonobankAcquiringClient`.
   */
  public constructor(transport: MonobankTransport) {
    this.transport = transport;
  }

  /**
   * Loads one tap-to-phone payment by the identifier the integrator assigned.
   *
   * Monobank keeps these payments for 90 days and answers 404 afterwards, so
   * treat a miss on an older payment as expected. Three response fields follow
   * their own conventions: `ccy` is alphabetic such as `UAH` rather than a
   * numeric ISO 4217 code, `dataTime` is space-separated rather than RFC-3339,
   * and `errorMessage` is explicitly `null` on success. `maskedPan` is the
   * masked card number and `cardMask` the scheme name. This safe authenticated
   * GET is retried only when the parent client has a bounded retry policy. A
   * provided `RequestOptions.signal` cancels the active attempt or retry delay.
   * @example
   * ```ts
   * const payment = await client.t2p.getPaymentStatus({
   *   externalPaymentId: "18247112-4eac-4465-aa3c-c42c18f601eb",
   * });
   * ```
   * @param input Integrator's external payment identifier.
   * @param options Optional cancellation controls for this request.
   * @returns Validated tap-to-phone payment state.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status, including 404 for a payment older than 90 days.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the payment schema.
   * @throws {MonobankValidationError} When `externalPaymentId` is not a nonempty string without surrounding whitespace.
   */
  public async getPaymentStatus(
    input: GetAcquiringT2pPaymentStatusInput,
    options?: RequestOptions,
  ): Promise<AcquiringT2pPayment> {
    const endpoint = createAcquiringT2pPaymentStatusEndpoint(input);

    return await this.transport.getJson({
      auth: true,
      endpoint,
      retryable: true,
      schema: acquiringT2pPaymentSchema,
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
  }

  /**
   * Lists the tap-to-phone terminals registered to the merchant.
   *
   * This safe authenticated GET is retried only when the parent client has a
   * bounded retry policy. A provided `RequestOptions.signal` cancels the active
   * attempt or retry delay.
   * @example
   * ```ts
   * const terminals = await client.t2p.listTerminals();
   * ```
   * @param options Optional cancellation controls for this request.
   * @returns Validated list of tap-to-phone terminals.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the terminal-list schema.
   * @throws {MonobankValidationError} When request configuration is invalid before Fetch runs.
   */
  public listTerminals(
    options?: RequestOptions,
  ): Promise<AcquiringT2pTerminalList> {
    return this.transport.getJson({
      auth: true,
      endpoint: listAcquiringT2pTerminalsEndpoint,
      retryable: true,
      schema: acquiringT2pTerminalListSchema,
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
  }
}
