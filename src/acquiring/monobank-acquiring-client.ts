import type { RequestOptions } from "../personal/request-options.js";
import { MonobankTransport } from "../transport/transport.js";
import type {
  Invoice,
  InvoiceCancellation,
  InvoiceFinalization,
  InvoiceFiscalChecks,
  InvoiceReceipt,
  NewInvoice,
} from "./invoice.js";
import {
  cancelInvoiceResponseSchema,
  finalizeInvoiceResponseSchema,
  invoiceFiscalChecksSchema,
  invoiceStatusSchema,
  newInvoiceSchema,
  receiptSchema,
} from "./invoice.js";
import type {
  CancelInvoiceInput,
  CreateInvoiceInput,
  CreateInvoiceOptions,
  FinalizeInvoiceInput,
  GetInvoiceFiscalChecksInput,
  GetInvoiceReceiptInput,
  GetInvoiceStatusInput,
  RemoveInvoiceInput,
} from "./invoice-input.js";
import {
  createCancelInvoiceBody,
  createFinalizeInvoiceBody,
  createInvoiceBody,
  createInvoiceFiscalChecksEndpoint,
  createInvoiceHeaders,
  createInvoiceReceiptEndpoint,
  createInvoiceStatusEndpoint,
  createRemoveInvoiceBody,
} from "./invoice-input.js";
import type { MerchantDetails } from "./merchant-details.js";
import { merchantDetailsSchema } from "./merchant-details.js";
import type { MonobankAcquiringClientOptions } from "./monobank-acquiring-client-options.js";

/**
 * Client for authenticated Monobank Acquiring API endpoints.
 * @example
 * ```ts
 * const client = new MonobankAcquiringClient({
 *   token: "acquiring-token",
 * });
 * const merchant = await client.getMerchantDetails();
 * ```
 */
export class MonobankAcquiringClient {
  private readonly transport: MonobankTransport;

  /**
   * Creates an Acquiring client and validates transport configuration before any request is sent.
   * @param options Acquiring token and optional Fetch, base URL, timeout, and retry controls.
   * @throws {MonobankValidationError} When token, base URL, timeout, retry, or Fetch configuration is invalid.
   */
  public constructor(options: MonobankAcquiringClientOptions) {
    this.transport = new MonobankTransport({
      ...options,
      authenticatedPathPrefix: "/api/merchant/",
    });
  }

  /**
   * Loads the merchant identity associated with the configured Acquiring token.
   *
   * This authenticated GET is eligible for the configured safe retry policy.
   * A provided `RequestOptions.signal` cancels the active Fetch attempt and any retry delay.
   * @param options Optional cancellation controls for this request.
   * @returns Validated merchant identifier, display name, and EDRPOU registration number.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the merchant-details schema.
   * @throws {MonobankValidationError} When request configuration is invalid before Fetch runs.
   */
  public getMerchantDetails(
    options?: RequestOptions,
  ): Promise<MerchantDetails> {
    return this.transport.getJson({
      auth: true,
      endpoint: "/api/merchant/details",
      retryable: true,
      schema: merchantDetailsSchema,
      ...requestSignal(options),
    });
  }

  /**
   * Creates a hosted Acquiring invoice.
   *
   * Amounts use the currency's minor units. A `hold` payment remains held for
   * up to nine days unless it is finalized or cancelled. This mutating POST is
   * never retried automatically.
   * @param input Amount and optional order, redirect, webhook, hold, QR, card-saving, fee, and tips data.
   * @param options Optional cancellation controls for this request.
   * @returns Validated invoice identifier and hosted payment-page URL.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the create-invoice schema.
   * @throws {MonobankValidationError} When request input is invalid before Fetch runs.
   */
  public async createInvoice(
    input: CreateInvoiceInput,
    options?: CreateInvoiceOptions,
  ): Promise<NewInvoice> {
    return await this.transport.postJson({
      auth: true,
      body: createInvoiceBody(input),
      endpoint: "/api/merchant/invoice/create",
      headers: createInvoiceHeaders(options),
      retryable: false,
      schema: newInvoiceSchema,
      ...requestSignal(options),
    });
  }

  /**
   * Loads the current state and available payment details for an invoice.
   *
   * This authenticated GET is eligible for the configured safe retry policy.
   * @param input Invoice identifier.
   * @param options Optional cancellation controls for this request.
   * @returns Validated invoice lifecycle and payment data.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the invoice-status schema.
   * @throws {MonobankValidationError} When `invoiceId` is empty before Fetch runs.
   */
  public async getInvoiceStatus(
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
   *
   * Fiscalization-enabled merchants can include the returned items. This
   * mutating POST is never retried automatically.
   * @param input Invoice identifier plus optional amount, merchant reference, and fiscalization items.
   * @param options Optional cancellation controls for this request.
   * @returns Validated cancellation operation status and timestamps.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the cancellation schema.
   * @throws {MonobankValidationError} When request input is invalid before Fetch runs.
   */
  public async cancelInvoice(
    input: CancelInvoiceInput,
    options?: RequestOptions,
  ): Promise<InvoiceCancellation> {
    return await this.transport.postJson({
      auth: true,
      body: createCancelInvoiceBody(input),
      endpoint: "/api/merchant/invoice/cancel",
      retryable: false,
      schema: cancelInvoiceResponseSchema,
      ...requestSignal(options),
    });
  }

  /**
   * Invalidates an unpaid invoice.
   *
   * Monobank rejects removal after the invoice has been paid. This mutating
   * POST is never retried automatically.
   * @param input Invoice identifier.
   * @param options Optional cancellation controls for this request.
   * @returns A promise that resolves after Monobank accepts the empty success response.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankValidationError} When `invoiceId` is empty before Fetch runs.
   */
  public async removeInvoice(
    input: RemoveInvoiceInput,
    options?: RequestOptions,
  ): Promise<void> {
    await this.transport.postEmpty({
      auth: true,
      body: createRemoveInvoiceBody(input),
      endpoint: "/api/merchant/invoice/remove",
      retryable: false,
      ...requestSignal(options),
    });
  }

  /**
   * Finalizes all or part of an invoice created with `paymentType: "hold"`.
   *
   * Fiscalization-enabled merchants can include items when the finalized
   * amount differs from the original amount. This mutating POST is never
   * retried automatically.
   * @param input Invoice identifier plus optional capture amount and fiscalization items.
   * @param options Optional cancellation controls for this request.
   * @returns Confirmation that Monobank accepted the finalization request.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the finalization schema.
   * @throws {MonobankValidationError} When request input is invalid before Fetch runs.
   */
  public async finalizeInvoice(
    input: FinalizeInvoiceInput,
    options?: RequestOptions,
  ): Promise<InvoiceFinalization> {
    return await this.transport.postJson({
      auth: true,
      body: createFinalizeInvoiceBody(input),
      endpoint: "/api/merchant/invoice/finalize",
      retryable: false,
      schema: finalizeInvoiceResponseSchema,
      ...requestSignal(options),
    });
  }

  /**
   * Loads an invoice receipt and optionally asks Monobank to email it.
   *
   * The returned `file`, when present, is a base64-encoded PDF. This
   * authenticated GET is eligible for the configured safe retry policy.
   * @param input Invoice identifier and optional delivery email.
   * @param options Optional cancellation controls for this request.
   * @returns Validated receipt payload.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the receipt schema.
   * @throws {MonobankValidationError} When `invoiceId` is empty before Fetch runs.
   */
  public async getInvoiceReceipt(
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
   *
   * Check files, when present, are base64-encoded PDFs. This authenticated GET
   * is eligible for the configured safe retry policy.
   * @param input Invoice identifier.
   * @param options Optional cancellation controls for this request.
   * @returns Validated fiscal checks payload.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the fiscal-check schema.
   * @throws {MonobankValidationError} When `invoiceId` is empty before Fetch runs.
   */
  public async getInvoiceFiscalChecks(
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
