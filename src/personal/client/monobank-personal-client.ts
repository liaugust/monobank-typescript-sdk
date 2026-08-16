import { MonobankTransport } from "../../transport/transport.js";
import { MonobankPersonalClientInfo } from "../client-info/monobank-personal-client-info.js";
import { MonobankPersonalStatements } from "../statements/monobank-personal-statements.js";
import { MonobankPersonalWebhooks } from "../webhooks/monobank-personal-webhooks.js";
import type { MonobankPersonalClientOptions } from "./monobank-personal-client-options.js";

/**
 * Client for Monobank Personal API endpoints with injected Fetch support for tests, proxies, and nonstandard runtimes.
 * @example
 * ```ts
 * const client = new MonobankPersonalClient({
 *   fetch: globalThis.fetch,
 *   token: "personal-token",
 * });
 * const profile = await client.client.getInfo();
 * ```
 */
export class MonobankPersonalClient {
  /** Authenticated Personal client identity and account operations. */
  public readonly client: MonobankPersonalClientInfo;

  /** Authenticated Personal account and jar statement operations. */
  public readonly statements: MonobankPersonalStatements;

  /** Authenticated Personal webhook configuration operations. */
  public readonly webhooks: MonobankPersonalWebhooks;

  /**
   * Creates a Personal client and validates transport configuration before any request is sent.
   * @param options Personal token and optional Fetch, base URL, timeout, and retry controls.
   * @throws {MonobankValidationError} When token, base URL, timeout, retry, or Fetch configuration is invalid.
   */
  public constructor(options: MonobankPersonalClientOptions) {
    const transport = new MonobankTransport(options);
    this.client = new MonobankPersonalClientInfo(transport);
    this.statements = new MonobankPersonalStatements(transport);
    this.webhooks = new MonobankPersonalWebhooks(transport);
  }
}
