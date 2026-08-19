import { MonobankTransport } from "../../transport/transport.js";
import { MonobankInstallmentsClients } from "../clients/monobank-installments-clients.js";
import { MonobankInstallmentsOrders } from "../orders/monobank-installments-orders.js";
import type { MonobankInstallmentsClientOptions } from "./monobank-installments-client-options.js";

const installmentsBaseUrl = "https://u2.monobank.com.ua";

/**
 * Client for the Monobank Покупка Частинами (buy-now-pay-later) API.
 *
 * This family is unlike the other four. It authenticates with a store identifier
 * and an HMAC-SHA256 signature over each request body rather than a token or an
 * ECDSA request signature, it lives on its own origin rather than
 * `api.monobank.ua`, its wire fields are snake_case, and its sums are hryvnia
 * rather than minor currency units. Those differences are upstream, and the SDK
 * preserves them rather than papering over them.
 * @example
 * ```ts
 * const installments = new MonobankInstallmentsClient({
 *   storeId: "your_store_id",
 *   storeSecret: process.env.MONOBANK_STORE_SECRET!,
 * });
 *
 * const lookup = await installments.clients.validateV2({
 *   phone: "+380501234567",
 * });
 * ```
 */
export class MonobankInstallmentsClient {
  /** Client-eligibility lookups sharing this client's credentials and transport settings. */
  public readonly clients: MonobankInstallmentsClients;

  /** Order lifecycle operations sharing this client's credentials and transport settings. */
  public readonly orders: MonobankInstallmentsOrders;

  /**
   * Creates an installments client and its resources over one validated transport.
   * @param options Store identifier and secret, plus optional Fetch, base URL, timeout, and retry controls.
   * @throws {MonobankValidationError} When the store credential, base URL, timeout, retry, or Fetch configuration is invalid.
   */
  public constructor(options: MonobankInstallmentsClientOptions) {
    const transport = new MonobankTransport({
      authenticatedPathPrefix: "/api/",
      baseUrl: options.baseUrl ?? installmentsBaseUrl,
      installments: {
        storeId: options.storeId,
        storeSecret: options.storeSecret,
      },
      ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
      ...(options.retry === undefined ? {} : { retry: options.retry }),
      ...(options.timeoutMs === undefined
        ? {}
        : { timeoutMs: options.timeoutMs }),
    });

    this.clients = new MonobankInstallmentsClients(transport);
    this.orders = new MonobankInstallmentsOrders(transport);
  }
}
