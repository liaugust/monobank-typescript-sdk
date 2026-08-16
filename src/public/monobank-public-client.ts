import type { BankSync } from "../personal/bank-sync.js";
import { bankSyncSchema } from "../personal/bank-sync.js";
import type { CurrencyRate } from "../personal/currency-rate.js";
import { currencyRatesSchema } from "../personal/currency-rate.js";
import type { RequestOptions } from "../personal/request-options.js";
import { MonobankTransport } from "../transport/transport.js";
import type { MonobankPublicClientOptions } from "./monobank-public-client-options.js";

/** Client for Monobank endpoints that do not require authentication. */
export class MonobankPublicClient {
  private readonly transport: MonobankTransport;

  /**
   * Creates a token-free public API client.
   * @param options Optional Fetch, base URL, timeout, and retry controls.
   * @throws {MonobankValidationError} When base URL, timeout, retry, or Fetch configuration is invalid.
   */
  public constructor(options: MonobankPublicClientOptions = {}) {
    this.transport = new MonobankTransport(options);
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
  public getBankSync(options?: RequestOptions): Promise<BankSync> {
    return this.transport.getJson({
      auth: false,
      endpoint: "/bank/sync",
      retryable: true,
      schema: bankSyncSchema,
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
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
  public getCurrencyRates(
    options?: RequestOptions,
  ): Promise<readonly CurrencyRate[]> {
    return this.transport.getJson({
      auth: false,
      endpoint: "/bank/currency",
      retryable: true,
      schema: currencyRatesSchema,
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
  }
}
