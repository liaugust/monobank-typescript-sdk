import type { RequestOptions } from "../../shared/request-options.js";
import type { MonobankTransport } from "../../transport/transport.js";
import type { AcquiringCardPayment } from "../shared/models/card-payment.js";
import { acquiringCardPaymentSchema } from "../shared/models/card-payment.js";
import type { CancelInvoiceInput } from "./cancel-invoice/cancel-invoice.js";
import {
  cancelInvoiceEndpoint,
  createCancelInvoiceBody,
} from "./cancel-invoice/cancel-invoice.js";
import type {
  CreateInvoiceInput,
  CreateInvoiceOptions,
  NewInvoice,
} from "./create-invoice/create-invoice.js";
import {
  createInvoiceBody,
  createInvoiceEndpoint,
  createInvoiceHeaders,
  newInvoiceSchema,
} from "./create-invoice/create-invoice.js";
import type {
  FinalizeInvoiceInput,
  InvoiceFinalization,
} from "./finalize-invoice/finalize-invoice.js";
import {
  createFinalizeInvoiceBody,
  finalizeInvoiceEndpoint,
  finalizeInvoiceResponseSchema,
} from "./finalize-invoice/finalize-invoice.js";
import type {
  GetInvoiceFiscalChecksInput,
  InvoiceFiscalChecks,
} from "./get-invoice-fiscal-checks/get-invoice-fiscal-checks.js";
import {
  createInvoiceFiscalChecksEndpoint,
  invoiceFiscalChecksSchema,
} from "./get-invoice-fiscal-checks/get-invoice-fiscal-checks.js";
import type {
  GetInvoiceReceiptInput,
  InvoiceReceipt,
} from "./get-invoice-receipt/get-invoice-receipt.js";
import {
  createInvoiceReceiptEndpoint,
  receiptSchema,
} from "./get-invoice-receipt/get-invoice-receipt.js";
import type {
  GetInvoiceStatusInput,
  Invoice,
} from "./get-invoice-status/get-invoice-status.js";
import {
  createInvoiceStatusEndpoint,
  invoiceStatusSchema,
} from "./get-invoice-status/get-invoice-status.js";
import type { InvoiceCancellation } from "./models/invoice-cancellation.js";
import { cancelInvoiceResponseSchema } from "./models/invoice-cancellation.js";
import type { PayInvoiceDirectInput } from "./pay-direct/pay-direct.js";
import {
  createPayInvoiceDirectBody,
  payInvoiceDirectEndpoint,
} from "./pay-direct/pay-direct.js";
import type { RemoveInvoiceInput } from "./remove-invoice/remove-invoice.js";
import {
  createRemoveInvoiceBody,
  removeInvoiceEndpoint,
} from "./remove-invoice/remove-invoice.js";
import type { SyncInvoicePaymentInput } from "./sync-payment/sync-payment.js";
import {
  createSyncInvoicePaymentBody,
  syncInvoicePaymentEndpoint,
} from "./sync-payment/sync-payment.js";

/** Invoice lifecycle operations available through an authenticated Acquiring client. */
export class MonobankAcquiringInvoices {
  private readonly transport: MonobankTransport;

  /**
   * Creates the invoice resource over the parent client's authenticated transport.
   * @param transport Shared Acquiring transport owned by `MonobankAcquiringClient`.
   */
  public constructor(transport: MonobankTransport) {
    this.transport = transport;
  }

  /**
   * Creates a hosted Acquiring invoice. Mutating requests are never retried automatically.
   * @param input Amount and optional order, redirect, webhook, hold, QR, card-saving, fee, and tips data.
   * @param options Optional cancellation controls and CMS attribution.
   * @returns Validated invoice identifier and hosted payment-page URL.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the create-invoice schema.
   * @throws {MonobankValidationError} When request input is invalid before Fetch runs.
   */
  public async create(
    input: CreateInvoiceInput,
    options?: CreateInvoiceOptions,
  ): Promise<NewInvoice> {
    return await this.transport.postJson({
      auth: true,
      body: createInvoiceBody(input),
      endpoint: createInvoiceEndpoint,
      headers: createInvoiceHeaders(options),
      retryable: false,
      schema: newInvoiceSchema,
      ...requestSignal(options),
    });
  }

  /**
   * Loads the current state and available payment details for an invoice.
   * @param input Invoice identifier.
   * @param options Optional cancellation controls for this request.
   * @returns Validated invoice lifecycle and payment data.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the invoice-status schema.
   * @throws {MonobankValidationError} When `invoiceId` is empty before Fetch runs.
   */
  public async getStatus(
    input: GetInvoiceStatusInput,
    options?: RequestOptions,
  ): Promise<Invoice> {
    const endpoint = createInvoiceStatusEndpoint(input);

    return await this.transport.getJson({
      auth: true,
      endpoint,
      retryable: true,
      schema: invoiceStatusSchema,
      ...requestSignal(options),
    });
  }

  /**
   * Requests a full or partial cancellation of a successful invoice payment.
   * @param input Invoice identifier plus optional amount, merchant reference, and fiscalization items.
   * @param options Optional cancellation controls for this request.
   * @returns Validated cancellation operation status and timestamps.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the cancellation schema.
   * @throws {MonobankValidationError} When request input is invalid before Fetch runs.
   */
  public async cancel(
    input: CancelInvoiceInput,
    options?: RequestOptions,
  ): Promise<InvoiceCancellation> {
    return await this.transport.postJson({
      auth: true,
      body: createCancelInvoiceBody(input),
      endpoint: cancelInvoiceEndpoint,
      retryable: false,
      schema: cancelInvoiceResponseSchema,
      ...requestSignal(options),
    });
  }

  /**
   * Invalidates an unpaid invoice. Mutating requests are never retried automatically.
   * @param input Invoice identifier.
   * @param options Optional cancellation controls for this request.
   * @returns A promise that resolves after Monobank accepts the empty success response.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankValidationError} When `invoiceId` is empty before Fetch runs.
   */
  public async remove(
    input: RemoveInvoiceInput,
    options?: RequestOptions,
  ): Promise<void> {
    await this.transport.postEmpty({
      auth: true,
      body: createRemoveInvoiceBody(input),
      endpoint: removeInvoiceEndpoint,
      retryable: false,
      ...requestSignal(options),
    });
  }

  /**
   * Finalizes all or part of an invoice created with `paymentType: "hold"`.
   * @param input Invoice identifier plus optional capture amount and fiscalization items.
   * @param options Optional cancellation controls for this request.
   * @returns Confirmation that Monobank accepted the finalization request.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the finalization schema.
   * @throws {MonobankValidationError} When request input is invalid before Fetch runs.
   */
  public async finalize(
    input: FinalizeInvoiceInput,
    options?: RequestOptions,
  ): Promise<InvoiceFinalization> {
    return await this.transport.postJson({
      auth: true,
      body: createFinalizeInvoiceBody(input),
      endpoint: finalizeInvoiceEndpoint,
      retryable: false,
      schema: finalizeInvoiceResponseSchema,
      ...requestSignal(options),
    });
  }

  /**
   * Loads an invoice receipt and optionally asks Monobank to email it.
   * @param input Invoice identifier and optional delivery email.
   * @param options Optional cancellation controls for this request.
   * @returns Validated receipt payload containing a base64-encoded PDF when available.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the receipt schema.
   * @throws {MonobankValidationError} When `invoiceId` is empty before Fetch runs.
   */
  public async getReceipt(
    input: GetInvoiceReceiptInput,
    options?: RequestOptions,
  ): Promise<InvoiceReceipt> {
    const endpoint = createInvoiceReceiptEndpoint(input);

    return await this.transport.getJson({
      auth: true,
      endpoint,
      retryable: true,
      schema: receiptSchema,
      ...requestSignal(options),
    });
  }

  /**
   * Loads fiscal checks and their processing status for an invoice.
   * @param input Invoice identifier.
   * @param options Optional cancellation controls for this request.
   * @returns Validated fiscal checks payload containing base64-encoded PDFs when available.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the fiscal-check schema.
   * @throws {MonobankValidationError} When `invoiceId` is empty before Fetch runs.
   */
  public async getFiscalChecks(
    input: GetInvoiceFiscalChecksInput,
    options?: RequestOptions,
  ): Promise<InvoiceFiscalChecks> {
    const endpoint = createInvoiceFiscalChecksEndpoint(input);

    return await this.transport.getJson({
      auth: true,
      endpoint,
      retryable: true,
      schema: invoiceFiscalChecksSchema,
      ...requestSignal(options),
    });
  }

  /**
   * Charges raw card details and returns the resulting payment.
   *
   * Passing a primary account number, expiry, and CVV through this method
   * places the calling system in PCI DSS scope: collect those values only on
   * certified infrastructure, and never log or persist them. Prefer
   * `acquiring.wallet.pay()` with a stored token, or a hosted invoice from
   * `create()`, whenever the flow allows it. Monobank enables this endpoint per
   * merchant. Amounts are integer minor currency units, and the result carries
   * `tdsUrl` when 3-D Secure is required. This request moves money and is never
   * retried.
   * @param input Amount, raw card details, and optional payment controls.
   * @param options Optional cancellation controls for this request.
   * @returns Validated payment result, including `tdsUrl` when 3-D Secure is required.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the card-payment schema.
   * @throws {MonobankValidationError} When the input does not match the documented request contract, rejected before Fetch runs.
   */
  public async payDirect(
    input: PayInvoiceDirectInput,
    options?: RequestOptions,
  ): Promise<AcquiringCardPayment> {
    const body = createPayInvoiceDirectBody(input);

    return await this.transport.postJson({
      auth: true,
      body,
      endpoint: payInvoiceDirectEndpoint,
      retryable: false,
      schema: acquiringCardPaymentSchema,
      ...requestSignal(options),
    });
  }

  /**
   * Settles one payment synchronously and returns the resulting invoice.
   *
   * Supply exactly one payment container: `cardData` for raw card and 3-D
   * Secure values, or a decrypted `applePay` or `googlePay` crypto container.
   * Handling those values places the calling system in PCI DSS scope, so
   * collect them only on certified infrastructure and never log or persist
   * them. Monobank enables this endpoint per merchant. This request moves money
   * and is never retried.
   * @param input Amount, currency, and exactly one payment container.
   * @param options Optional cancellation controls for this request.
   * @returns Validated invoice describing the settled payment.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the invoice schema.
   * @throws {MonobankValidationError} When the input is invalid or does not carry exactly one payment container, rejected before Fetch runs.
   */
  public async syncPayment(
    input: SyncInvoicePaymentInput,
    options?: RequestOptions,
  ): Promise<Invoice> {
    const body = createSyncInvoicePaymentBody(input);

    return await this.transport.postJson({
      auth: true,
      body,
      endpoint: syncInvoicePaymentEndpoint,
      retryable: false,
      schema: invoiceStatusSchema,
      ...requestSignal(options),
    });
  }
}

function requestSignal(options: RequestOptions | undefined): {
  readonly signal?: AbortSignal;
} {
  return options?.signal === undefined ? {} : { signal: options.signal };
}
