import { MonobankTransport } from "../../transport/transport.js";
import { MonobankPublicBank } from "../bank/monobank-public-bank.js";
import { MonobankPublicCurrency } from "../currency/monobank-public-currency.js";
import type { MonobankPublicClientOptions } from "./monobank-public-client-options.js";

/** Client for Monobank endpoints that do not require authentication. */
export class MonobankPublicClient {
  /** Token-free bank metadata operations. */
  public readonly bank: MonobankPublicBank;

  /** Token-free currency operations. */
  public readonly currency: MonobankPublicCurrency;

  /**
   * Creates a token-free public API client and its resource classes.
   * @param options Optional Fetch, base URL, timeout, and retry controls.
   * @throws {MonobankValidationError} When base URL, timeout, retry, or Fetch configuration is invalid.
   */
  public constructor(options: MonobankPublicClientOptions = {}) {
    const transport = new MonobankTransport(options);
    this.bank = new MonobankPublicBank(transport);
    this.currency = new MonobankPublicCurrency(transport);
  }
}
