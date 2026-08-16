import type { RequestOptions } from "../../shared/request-options.js";
import type { MonobankTransport } from "../../transport/transport.js";
import { listAcquiringSubmerchantsEndpoint } from "./list-submerchants/list-submerchants.js";
import type { AcquiringSubmerchantList } from "./models/acquiring-submerchant.js";
import { acquiringSubmerchantListSchema } from "./models/acquiring-submerchant.js";

/** Authenticated Acquiring submerchant operations. */
export class MonobankAcquiringSubmerchants {
  private readonly transport: MonobankTransport;

  /**
   * Creates the submerchants resource over the parent client's authenticated transport.
   * @param transport Shared Acquiring transport owned by `MonobankAcquiringClient`.
   */
  public constructor(transport: MonobankTransport) {
    this.transport = transport;
  }

  /**
   * Lists the submerchant terminals available to the configured merchant.
   * @param options Optional cancellation controls for this request.
   * @returns Validated Acquiring submerchant-list response.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the submerchant-list schema.
   * @throws {MonobankValidationError} When request configuration is invalid before Fetch runs.
   */
  public list(options?: RequestOptions): Promise<AcquiringSubmerchantList> {
    return this.transport.getJson({
      auth: true,
      endpoint: listAcquiringSubmerchantsEndpoint,
      retryable: true,
      schema: acquiringSubmerchantListSchema,
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
  }
}
