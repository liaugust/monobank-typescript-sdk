import type { RequestOptions } from "../personal/request-options.js";
import { MonobankTransport } from "../transport/transport.js";
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
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
  }
}
