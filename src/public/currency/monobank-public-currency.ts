import type { RequestOptions } from "../../shared/request-options.js";
import type { MonobankTransport } from "../../transport/transport.js";
import type { CurrencyRate } from "./get-rates/get-rates.js";
import {
  currencyRatesSchema,
  getCurrencyRatesEndpoint,
} from "./get-rates/get-rates.js";

/** Token-free Monobank currency operations. */
export class MonobankPublicCurrency {
  private readonly transport: MonobankTransport;

  /**
   * Creates the currency resource over the parent client's transport.
   * @param transport Shared token-free transport owned by `MonobankPublicClient`.
   */
  public constructor(transport: MonobankTransport) {
    this.transport = transport;
  }

  /**
   * Loads public currency rates without sending `X-Token`.
   * @param options Optional cancellation controls for this request.
   * @returns Public currency quotes with ISO 4217 numeric codes and Unix-second quote timestamps.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the public schema.
   * @throws {MonobankValidationError} When request configuration is invalid before Fetch runs.
   */
  public getRates(options?: RequestOptions): Promise<readonly CurrencyRate[]> {
    return this.transport.getJson({
      auth: false,
      endpoint: getCurrencyRatesEndpoint,
      retryable: true,
      schema: currencyRatesSchema,
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
  }
}
