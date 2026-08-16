import type { RequestOptions } from "../../shared/request-options.js";
import { MonobankTransport } from "../../transport/transport.js";
import { MonobankPersonalClientInfo } from "../client-info/monobank-personal-client-info.js";
import type { SetWebhookInput } from "../set-webhook-input.js";
import { createSetWebhookBody } from "../set-webhook-input.js";
import { MonobankPersonalStatements } from "../statements/monobank-personal-statements.js";
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

  private readonly transport: MonobankTransport;

  /**
   * Creates a Personal client and validates transport configuration before any request is sent.
   * @param options Personal token and optional Fetch, base URL, timeout, and retry controls.
   * @throws {MonobankValidationError} When token, base URL, timeout, retry, or Fetch configuration is invalid.
   */
  public constructor(options: MonobankPersonalClientOptions) {
    this.transport = new MonobankTransport(options);
    this.client = new MonobankPersonalClientInfo(this.transport);
    this.statements = new MonobankPersonalStatements(this.transport);
  }

  /**
   * Sets or removes the authenticated Personal webhook URL.
   *
   * Pass an absolute HTTP(S) URL to receive Personal statement events, or an
   * empty string to remove the existing webhook. This mutating POST is never
   * retried automatically, even when the client has a retry policy. A provided
   * `RequestOptions.signal` cancels the active Fetch attempt.
   * @example
   * ```ts
   * await client.setWebhook({
   *   webHookUrl: "https://example.test/monobank-webhook",
   * });
   * ```
   * @param input Webhook URL configuration request.
   * @param options Optional cancellation controls for this request.
   * @returns A promise that resolves after Monobank accepts the empty success response.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankValidationError} When the webhook URL is invalid before Fetch runs.
   */
  public async setWebhook(
    input: SetWebhookInput,
    options?: RequestOptions,
  ): Promise<void> {
    await this.transport.postEmpty({
      auth: true,
      body: createSetWebhookBody(input),
      endpoint: "/personal/webhook",
      retryable: false,
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
  }
}
