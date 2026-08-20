import type { RequestOptions } from "../../shared/request-options.js";
import { requestSignal } from "../../shared/request-options.js";
import type { MonobankTransport } from "../../transport/transport.js";
import type { MerchantDetails } from "./get-merchant-details/get-merchant-details.js";
import { merchantDetailsSchema } from "./get-merchant-details/get-merchant-details.js";

/** Merchant operations available through an authenticated Acquiring client. */
export class MonobankAcquiringMerchant {
  private readonly transport: MonobankTransport;

  /**
   * Creates the merchant resource over the parent client's authenticated transport.
   * @param transport Shared Acquiring transport owned by `MonobankAcquiringClient`.
   */
  public constructor(transport: MonobankTransport) {
    this.transport = transport;
  }

  /**
   * Loads the merchant identity associated with the configured Acquiring token.
   * @param options Optional cancellation controls for this request.
   * @returns Validated merchant identifier, display name, and EDRPOU registration number.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the merchant-details schema.
   * @throws {MonobankValidationError} When request configuration is invalid before Fetch runs.
   */
  public getDetails(options?: RequestOptions): Promise<MerchantDetails> {
    return this.transport.getJson({
      auth: true,
      endpoint: "/api/merchant/details",
      retryable: true,
      schema: merchantDetailsSchema,
      ...requestSignal(options),
    });
  }
}
