import type { RequestOptions } from "../../shared/request-options.js";
import type { MonobankTransport } from "../../transport/transport.js";
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
import type { InvoiceCancellation } from "./invoice-cancellation.js";
import { cancelInvoiceResponseSchema } from "./invoice-cancellation.js";
import type { RemoveInvoiceInput } from "./remove-invoice/remove-invoice.js";
import {
  createRemoveInvoiceBody,
  removeInvoiceEndpoint,
} from "./remove-invoice/remove-invoice.js";

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
}

function requestSignal(options: RequestOptions | undefined): {
  readonly signal?: AbortSignal;
} {
  return options?.signal === undefined ? {} : { signal: options.signal };
}
