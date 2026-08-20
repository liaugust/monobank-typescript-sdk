import type { RequestOptions } from "../../shared/request-options.js";
import { requestSignal } from "../../shared/request-options.js";
import type { MonobankTransport } from "../../transport/transport.js";
import type { CheckCorporateAccessInput } from "./check-access/check-access.js";
import {
  checkCorporateAccessEndpoint,
  parseCheckCorporateAccessInput,
} from "./check-access/check-access.js";
import type {
  CorporateTokenRequest,
  RequestCorporateAccessInput,
} from "./request-access/request-access.js";
import {
  corporateTokenRequestSchema,
  createRequestCorporateAccessHeaders,
  requestCorporateAccessEndpoint,
} from "./request-access/request-access.js";

/**
 * Delegated client-access operations for an approved Corporate provider.
 *
 * These calls exist to read another person's banking data. Access is granted by
 * that client, applies only to the permissions the company registered, and the
 * client can revoke it at any time.
 */
export class MonobankCorporateAccess {
  private readonly transport: MonobankTransport;

  /**
   * Creates the access resource over the parent client's signed transport.
   * @param transport Shared Corporate transport owned by `MonobankCorporateClient`.
   */
  public constructor(transport: MonobankTransport) {
    this.transport = transport;
  }

  /**
   * Initializes a request for access to one client's data.
   *
   * Show the returned `acceptUrl` to the client as a QR code, or redirect a
   * mobile client to it. Keep `tokenRequestId`: it identifies this grant in
   * `check()` and in every later delegated read. Signed with the `X-Time` and
   * URL payload. Mutating request; never retried.
   * @param input Optional callback address Monobank notifies on approval.
   * @param options Optional cancellation controls for this request.
   * @returns Validated request identifier and the approval URL to show the client.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the schema.
   * @throws {MonobankValidationError} When the callback address is invalid, no key is configured, or the signer fails.
   */
  public async request(
    input: RequestCorporateAccessInput = {},
    options?: RequestOptions,
  ): Promise<CorporateTokenRequest> {
    const headers = createRequestCorporateAccessHeaders(input);

    return await this.transport.postJson({
      auth: true,
      endpoint: requestCorporateAccessEndpoint,
      headers,
      retryable: false,
      schema: corporateTokenRequestSchema,
      signature: { variant: "time-and-url" },
      ...requestSignal(options),
    });
  }

  /**
   * Checks whether the client has granted the requested access.
   *
   * Resolves when access is granted; Monobank answers with an empty body, so
   * there is no value to return. A pending grant surfaces as
   * `MonobankApiError` with status 401 and an unknown request as status 404,
   * which is how a caller distinguishes the two. Signed with the `X-Time`,
   * `X-Request-Id`, and URL payload. Safe GET; eligible for configured
   * retries, and each retry is signed again.
   * @param input Request identifier from `access.request()`.
   * @param options Optional cancellation controls for this request.
   * @throws {MonobankApiError} When access is still pending (401), the request is unknown (404), or another non-success status is returned.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankValidationError} When the identifier is invalid, no key is configured, or the signer fails.
   */
  public async check(
    input: CheckCorporateAccessInput,
    options?: RequestOptions,
  ): Promise<void> {
    const parsed = parseCheckCorporateAccessInput(input);

    await this.transport.getEmpty({
      auth: true,
      endpoint: checkCorporateAccessEndpoint,
      retryable: true,
      signature: {
        requestId: parsed.requestId,
        variant: "time-request-id-and-url",
      },
      ...requestSignal(options),
    });
  }
}
