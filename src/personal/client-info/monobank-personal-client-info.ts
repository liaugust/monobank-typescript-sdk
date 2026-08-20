import type { RequestOptions } from "../../shared/request-options.js";
import { requestSignal } from "../../shared/request-options.js";
import type { MonobankTransport } from "../../transport/transport.js";
import type { ClientInfo } from "./get-info/get-info.js";
import {
  clientInfoSchema,
  getClientInfoEndpoint,
} from "./get-info/get-info.js";

/** Authenticated Personal client identity, account, jar, and delegated-client operations. */
export class MonobankPersonalClientInfo {
  private readonly transport: MonobankTransport;

  /**
   * Creates the client-info resource over the parent client's authenticated transport.
   * @param transport Shared Personal transport owned by `MonobankPersonalClient`.
   */
  public constructor(transport: MonobankTransport) {
    this.transport = transport;
  }

  /**
   * Loads authenticated Personal client profile, accounts, jars, and delegated FOP clients.
   *
   * Monobank limits this endpoint to one request per 60 seconds. This safe GET
   * is retried only when a bounded retry policy is supplied to the parent.
   * @param options Optional cancellation controls for this request.
   * @returns Validated Personal client information with monetary values in minor currency units.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the client-info schema.
   * @throws {MonobankValidationError} When request configuration is invalid before Fetch runs.
   */
  public getInfo(options?: RequestOptions): Promise<ClientInfo> {
    return this.transport.getJson({
      auth: true,
      endpoint: getClientInfoEndpoint,
      retryable: true,
      schema: clientInfoSchema,
      ...requestSignal(options),
    });
  }
}
