import type { RequestOptions } from "../../shared/request-options.js";
import type { MonobankTransport } from "../../transport/transport.js";
import type { CancelDocumentSigningInput } from "./cancel-signing/cancel-signing.js";
import { createCancelDocumentSigningEndpoint } from "./cancel-signing/cancel-signing.js";
import type {
  DocumentSigningStatus,
  GetDocumentSigningStatusInput,
} from "./get-signing-status/get-signing-status.js";
import {
  createDocumentSigningStatusEndpoint,
  documentSigningStatusSchema,
} from "./get-signing-status/get-signing-status.js";
import type {
  DocumentSigningRequest,
  RequestDocumentSigningInput,
} from "./request-signing/request-signing.js";
import {
  documentSigningRequestSchema,
  parseRequestDocumentSigningInput,
  requestDocumentSigningEndpoint,
} from "./request-signing/request-signing.js";

/**
 * monoКЕП document signing operations for an approved Corporate provider.
 *
 * Document hashes use ГОСТ 34.311-95, which no JavaScript runtime implements, so
 * the caller computes them and the SDK only carries the hex value.
 */
export class MonobankCorporateDocuments {
  private readonly transport: MonobankTransport;

  /**
   * Creates the document-signing resource over the parent client's signed transport.
   * @param transport Shared Corporate transport owned by `MonobankCorporateClient`.
   */
  public constructor(transport: MonobankTransport) {
    this.transport = transport;
  }

  /**
   * Creates a request to sign one to ten documents.
   *
   * The request is valid for three days. Give the returned `deeplink` to the
   * signatory to open in the Monobank app, and keep `requestId` for status and
   * cancellation. Mutating request; never retried.
   * @param input Documents with ГОСТ 34.311-95 hex hashes, signer policy, and optional callback.
   * @param options Optional cancellation controls for this request.
   * @returns Validated signing request identifier and signatory deeplink.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the schema.
   * @throws {MonobankValidationError} When the document list is invalid, no key is configured, or the signer fails.
   */
  public async requestSigning(
    input: RequestDocumentSigningInput,
    options?: RequestOptions,
  ): Promise<DocumentSigningRequest> {
    const body = parseRequestDocumentSigningInput(input);

    return await this.transport.postJson({
      auth: true,
      body,
      endpoint: requestDocumentSigningEndpoint,
      retryable: false,
      schema: documentSigningRequestSchema,
      signature: { variant: "time-and-url" },
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
  }

  /**
   * Loads the signing progress of every document in a request.
   *
   * Safe GET; eligible for configured retries. The signed payload covers the
   * `requestId` query parameter, because it is part of the URL.
   * @param input Signing request identifier.
   * @param options Optional cancellation controls for this request.
   * @returns Validated per-document state and signatory details.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the schema.
   * @throws {MonobankValidationError} When the identifier is invalid, no key is configured, or the signer fails.
   */
  public async getSigningStatus(
    input: GetDocumentSigningStatusInput,
    options?: RequestOptions,
  ): Promise<DocumentSigningStatus> {
    const endpoint = createDocumentSigningStatusEndpoint(input);

    return await this.transport.getJson({
      auth: true,
      endpoint,
      retryable: true,
      schema: documentSigningStatusSchema,
      signature: { variant: "time-and-url" },
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
  }

  /**
   * Cancels a signing request before its three-day validity expires.
   *
   * Sent as HTTP DELETE and never retried.
   * @param input Signing request identifier.
   * @param options Optional cancellation controls for this request.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankValidationError} When the identifier is invalid, no key is configured, or the signer fails.
   */
  public async cancelSigning(
    input: CancelDocumentSigningInput,
    options?: RequestOptions,
  ): Promise<void> {
    const endpoint = createCancelDocumentSigningEndpoint(input);

    await this.transport.deleteEmpty({
      auth: true,
      endpoint,
      retryable: false,
      signature: { variant: "time-and-url" },
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
  }
}
