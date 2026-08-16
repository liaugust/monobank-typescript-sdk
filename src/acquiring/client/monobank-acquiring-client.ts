import { MonobankTransport } from "../../transport/transport.js";
import { MonobankAcquiringInvoices } from "../invoices/monobank-acquiring-invoices.js";
import { MonobankAcquiringMerchant } from "../merchant/monobank-acquiring-merchant.js";
import { MonobankAcquiringQr } from "../qr/monobank-acquiring-qr.js";
import { MonobankAcquiringStatements } from "../statements/monobank-acquiring-statements.js";
import { MonobankAcquiringSubmerchants } from "../submerchants/monobank-acquiring-submerchants.js";
import { MonobankAcquiringWebhooks } from "../webhooks/monobank-acquiring-webhooks.js";
import type { MonobankAcquiringClientOptions } from "./monobank-acquiring-client-options.js";

/**
 * Client for authenticated Monobank Acquiring API resources.
 * @example
 * ```ts
 * const client = new MonobankAcquiringClient({ token: "acquiring-token" });
 * const merchant = await client.merchant.getDetails();
 * const invoice = await client.invoices.create({ amount: 4_200 });
 * const statement = await client.statements.get({ from: new Date(0) });
 * ```
 */
export class MonobankAcquiringClient {
  /** Invoice lifecycle operations sharing this client's credentials and transport settings. */
  public readonly invoices: MonobankAcquiringInvoices;

  /** Merchant operations sharing this client's credentials and transport settings. */
  public readonly merchant: MonobankAcquiringMerchant;

  /** QR cashier listing, details, and amount-reset operations sharing this client's credentials and transport settings. */
  public readonly qr: MonobankAcquiringQr;

  /** Transaction statement operations sharing this client's credentials and transport settings. */
  public readonly statements: MonobankAcquiringStatements;

  /** Submerchant terminal operations sharing this client's credentials and transport settings. */
  public readonly submerchants: MonobankAcquiringSubmerchants;

  /** Webhook authentication operations sharing this client's credentials and transport settings. */
  public readonly webhooks: MonobankAcquiringWebhooks;

  /**
   * Creates an Acquiring client and its resource classes over one validated transport.
   * @param options Acquiring token and optional Fetch, base URL, timeout, and retry controls.
   * @throws {MonobankValidationError} When token, base URL, timeout, retry, or Fetch configuration is invalid.
   */
  public constructor(options: MonobankAcquiringClientOptions) {
    const transport = new MonobankTransport({
      ...options,
      authenticatedPathPrefix: "/api/merchant/",
    });

    this.invoices = new MonobankAcquiringInvoices(transport);
    this.merchant = new MonobankAcquiringMerchant(transport);
    this.qr = new MonobankAcquiringQr(transport);
    this.statements = new MonobankAcquiringStatements(transport);
    this.submerchants = new MonobankAcquiringSubmerchants(transport);
    this.webhooks = new MonobankAcquiringWebhooks(transport);
  }
}
