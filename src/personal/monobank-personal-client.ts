import { MonobankTransport } from "../transport/transport.js";
import type { BankSync } from "./bank-sync.js";
import { bankSyncSchema } from "./bank-sync.js";
import type { ClientInfo } from "./client-info.js";
import { clientInfoSchema } from "./client-info.js";
import type { CurrencyRate } from "./currency-rate.js";
import { currencyRatesSchema } from "./currency-rate.js";
import type { MonobankPersonalClientOptions } from "./monobank-personal-client-options.js";
import type { RequestOptions } from "./request-options.js";

/**
 * Client for Monobank Personal API endpoints with injected Fetch support for tests, proxies, and nonstandard runtimes.
 * @example
 * ```ts
 * const client = new MonobankPersonalClient({
 *   fetch: globalThis.fetch,
 *   token: "personal-token",
 * });
 * const rates = await client.getCurrencyRates();
 * ```
 */
export class MonobankPersonalClient {
  private readonly transport: MonobankTransport;

  /**
   * Creates a Personal client and validates transport configuration before any request is sent.
   * @param options Personal token and optional Fetch, base URL, timeout, and retry controls.
   * @throws {MonobankValidationError} When token, base URL, timeout, retry, or Fetch configuration is invalid.
   */
  public constructor(options: MonobankPersonalClientOptions) {
    this.transport = new MonobankTransport(options);
  }

  /**
   * Loads public Monobank synchronization metadata without sending `X-Token`.
   *
   * This public GET is eligible for the configured safe retry policy only when
   * `retry` is supplied to the constructor. A provided `RequestOptions.signal`
   * cancels the active Fetch attempt and any retry delay.
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
   *
   * This public GET is eligible for the configured safe retry policy only when
   * `retry` is supplied to the constructor. A provided `RequestOptions.signal`
   * cancels the active Fetch attempt and any retry delay.
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

  /**
   * Loads authenticated Personal client profile, accounts, jars, and delegated FOP clients.
   *
   * Monobank limits this authenticated endpoint to one request per 60 seconds.
   * This safe GET is retried only when a bounded retry policy is supplied to
   * the constructor. A provided `RequestOptions.signal` cancels the active
   * Fetch attempt and any retry delay.
   * @param options Optional cancellation controls for this request.
   * @returns Validated Personal client information with monetary values in minor currency units.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the client-info schema.
   * @throws {MonobankValidationError} When request configuration is invalid before Fetch runs.
   */
  public getClientInfo(options?: RequestOptions): Promise<ClientInfo> {
    return this.transport.getJson({
      auth: true,
      endpoint: "/personal/client-info",
      retryable: true,
      schema: clientInfoSchema,
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
  }
}
