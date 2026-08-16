import type { RequestOptions } from "../../shared/request-options.js";
import type { MonobankTransport } from "../../transport/transport.js";
import type { GetAcquiringQrDetailsInput } from "./get-qr-details/get-qr-details.js";
import { createAcquiringQrDetailsEndpoint } from "./get-qr-details/get-qr-details.js";
import { listAcquiringQrCashiersEndpoint } from "./list-qr-cashiers/list-qr-cashiers.js";
import type { AcquiringQrCashierList } from "./models/acquiring-qr-cashier.js";
import { acquiringQrCashierListSchema } from "./models/acquiring-qr-cashier.js";
import type { AcquiringQrDetails } from "./models/acquiring-qr-details.js";
import { acquiringQrDetailsSchema } from "./models/acquiring-qr-details.js";
import type { ResetAcquiringQrAmountInput } from "./reset-qr-amount/reset-qr-amount.js";
import {
  createResetAcquiringQrAmountBody,
  resetAcquiringQrAmountEndpoint,
} from "./reset-qr-amount/reset-qr-amount.js";

/** Acquiring QR cashier listing, details, and amount-reset operations. */
export class MonobankAcquiringQr {
  private readonly transport: MonobankTransport;

  /**
   * Creates the QR resource over the parent client's authenticated transport.
   * @param transport Shared Acquiring transport owned by `MonobankAcquiringClient`.
   */
  public constructor(transport: MonobankTransport) {
    this.transport = transport;
  }

  /**
   * Lists the QR cashiers available to the configured merchant.
   *
   * This safe authenticated GET is retried only when the parent client has a
   * bounded retry policy. A provided `RequestOptions.signal` cancels the active
   * attempt or retry delay.
   * @example
   * ```ts
   * const cashiers = await client.qr.list();
   * ```
   * @param options Optional cancellation controls for this request.
   * @returns Validated Acquiring QR cashier-list response.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the QR cashier-list schema.
   * @throws {MonobankValidationError} When request configuration is invalid before Fetch runs.
   */
  public list(options?: RequestOptions): Promise<AcquiringQrCashierList> {
    return this.transport.getJson({
      auth: true,
      endpoint: listAcquiringQrCashiersEndpoint,
      retryable: true,
      schema: acquiringQrCashierListSchema,
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
  }

  /**
   * Loads the current state of one activated QR cashier.
   *
   * Monobank documents `invoiceId` as present only while an amount is set on
   * the cashier; `amount` and `ccy` may be omitted for the same reason, and
   * amounts are minor currency units. This safe authenticated GET is retried
   * only when the parent client has a bounded retry policy. A provided
   * `RequestOptions.signal` cancels the active attempt or retry delay.
   * @example
   * ```ts
   * const details = await client.qr.getDetails({ qrId: "XJ_DiM4rTd5V" });
   * ```
   * @param input QR cashier identifier returned by `list()`.
   * @param options Optional cancellation controls for this request.
   * @returns Validated QR cashier details for an activated cashier.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status, including an unknown QR cashier.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the QR details schema.
   * @throws {MonobankValidationError} When `qrId` is not a nonempty string without surrounding whitespace, rejected before Fetch runs.
   */
  public async getDetails(
    input: GetAcquiringQrDetailsInput,
    options?: RequestOptions,
  ): Promise<AcquiringQrDetails> {
    const endpoint = createAcquiringQrDetailsEndpoint(input);

    return await this.transport.getJson({
      auth: true,
      endpoint,
      retryable: true,
      schema: acquiringQrDetailsSchema,
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
  }

  /**
   * Clears the payment amount currently set on a QR cashier.
   *
   * Monobank returns an empty success payload, so this method resolves to
   * `undefined`. The request mutates merchant state and is therefore never
   * retried, even when the parent client has a retry policy; a caller that
   * wants another attempt must decide that itself. A provided
   * `RequestOptions.signal` cancels the active attempt.
   * @example
   * ```ts
   * await client.qr.resetAmount({ qrId: "XJ_DiM4rTd5V" });
   * ```
   * @param input QR cashier identifier returned by `list()`.
   * @param options Optional cancellation controls for this request.
   * @returns Nothing; Monobank acknowledges the reset with an empty payload.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status, including an unknown QR cashier.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankValidationError} When `qrId` is not a nonempty string without surrounding whitespace, rejected before Fetch runs.
   */
  public async resetAmount(
    input: ResetAcquiringQrAmountInput,
    options?: RequestOptions,
  ): Promise<void> {
    await this.transport.postEmpty({
      auth: true,
      body: createResetAcquiringQrAmountBody(input),
      endpoint: resetAcquiringQrAmountEndpoint,
      retryable: false,
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
  }
}
