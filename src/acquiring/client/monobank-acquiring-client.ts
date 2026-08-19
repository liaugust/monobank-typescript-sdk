import { MonobankTransport } from "../../transport/transport.js";
import { MonobankAcquiringEmployees } from "../employees/monobank-acquiring-employees.js";
import { MonobankAcquiringInvoices } from "../invoices/monobank-acquiring-invoices.js";
import { MonobankAcquiringMerchant } from "../merchant/monobank-acquiring-merchant.js";
import { MonobankAcquiringMonopay } from "../monopay/monobank-acquiring-monopay.js";
import { MonobankAcquiringPos } from "../pos/monobank-acquiring-pos.js";
import { MonobankAcquiringQr } from "../qr/monobank-acquiring-qr.js";
import { MonobankAcquiringSplit } from "../split/monobank-acquiring-split.js";
import { MonobankAcquiringStatements } from "../statements/monobank-acquiring-statements.js";
import { MonobankAcquiringSubmerchants } from "../submerchants/monobank-acquiring-submerchants.js";
import { MonobankAcquiringSubscriptions } from "../subscriptions/monobank-acquiring-subscriptions.js";
import { MonobankAcquiringT2p } from "../t2p/monobank-acquiring-t2p.js";
import { MonobankAcquiringWallet } from "../wallet/monobank-acquiring-wallet.js";
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
  /** Employee operations sharing this client's credentials and transport settings. */
  public readonly employees: MonobankAcquiringEmployees;

  /** Invoice lifecycle operations sharing this client's credentials and transport settings. */
  public readonly invoices: MonobankAcquiringInvoices;

  /** Merchant operations sharing this client's credentials and transport settings. */
  public readonly merchant: MonobankAcquiringMerchant;

  /** monopay button signing-key operations sharing this client's credentials and transport settings. */
  public readonly monopay: MonobankAcquiringMonopay;

  /** POS refund operations sharing this client's credentials and transport settings. */
  public readonly pos: MonobankAcquiringPos;

  /** QR cashier listing, details, and amount-reset operations sharing this client's credentials and transport settings. */
  public readonly qr: MonobankAcquiringQr;

  /** Split-payment receiver operations sharing this client's credentials and transport settings. */
  public readonly split: MonobankAcquiringSplit;

  /** Transaction statement operations sharing this client's credentials and transport settings. */
  public readonly statements: MonobankAcquiringStatements;

  /** Submerchant terminal operations sharing this client's credentials and transport settings. */
  public readonly submerchants: MonobankAcquiringSubmerchants;

  /** Recurring-payment operations sharing this client's credentials and transport settings. */
  public readonly subscriptions: MonobankAcquiringSubscriptions;

  /** Tap-to-phone operations sharing this client's credentials and transport settings. */
  public readonly t2p: MonobankAcquiringT2p;

  /** Tokenized card operations sharing this client's credentials and transport settings. */
  public readonly wallet: MonobankAcquiringWallet;

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

    this.employees = new MonobankAcquiringEmployees(transport);
    this.invoices = new MonobankAcquiringInvoices(transport);
    this.merchant = new MonobankAcquiringMerchant(transport);
    this.monopay = new MonobankAcquiringMonopay(transport);
    this.pos = new MonobankAcquiringPos(transport);
    this.qr = new MonobankAcquiringQr(transport);
    this.split = new MonobankAcquiringSplit(transport);
    this.statements = new MonobankAcquiringStatements(transport);
    this.submerchants = new MonobankAcquiringSubmerchants(transport);
    this.subscriptions = new MonobankAcquiringSubscriptions(transport);
    this.t2p = new MonobankAcquiringT2p(transport);
    this.wallet = new MonobankAcquiringWallet(transport);
    this.webhooks = new MonobankAcquiringWebhooks(transport);
  }
}
