import type { RequestOptions } from "../../shared/request-options.js";
import type { MonobankTransport } from "../../transport/transport.js";
import type { BankSync } from "./get-sync/get-sync.js";
import { bankSyncSchema, getBankSyncEndpoint } from "./get-sync/get-sync.js";

/** Token-free Monobank bank metadata operations. */
export class MonobankPublicBank {
  private readonly transport: MonobankTransport;

  /**
   * Creates the bank resource over the parent client's transport.
   * @param transport Shared token-free transport owned by `MonobankPublicClient`.
   */
  public constructor(transport: MonobankTransport) {
    this.transport = transport;
  }

  /**
   * Loads public Monobank synchronization metadata without sending `X-Token`.
   * @param options Optional cancellation controls for this request.
   * @returns Public bank synchronization metadata including server time in Unix milliseconds.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the public schema.
   * @throws {MonobankValidationError} When request configuration is invalid before Fetch runs.
   */
  public getSync(options?: RequestOptions): Promise<BankSync> {
    return this.transport.getJson({
      auth: false,
      endpoint: getBankSyncEndpoint,
      retryable: true,
      schema: bankSyncSchema,
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
  }
}
