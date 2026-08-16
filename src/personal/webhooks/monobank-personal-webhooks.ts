import type { RequestOptions } from "../../shared/request-options.js";
import type { MonobankTransport } from "../../transport/transport.js";
import type { SetWebhookInput } from "./set-webhook/set-webhook.js";
import {
  createSetWebhookBody,
  setWebhookEndpoint,
} from "./set-webhook/set-webhook.js";

/** Authenticated Personal webhook configuration operations. */
export class MonobankPersonalWebhooks {
  private readonly transport: MonobankTransport;

  /**
   * Creates the webhooks resource over the parent client's authenticated transport.
   * @param transport Shared Personal transport owned by `MonobankPersonalClient`.
   */
  public constructor(transport: MonobankTransport) {
    this.transport = transport;
  }

  /**
   * Sets or removes the authenticated Personal webhook URL.
   *
   * Pass an absolute HTTP(S) URL to receive Personal statement events, or an
   * empty string to remove the existing webhook. This mutating POST is never
   * retried automatically, even when the parent client has a retry policy. A
   * provided `RequestOptions.signal` cancels the active Fetch attempt.
   * @example
   * ```ts
   * await client.webhooks.set({
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
  public async set(
    input: SetWebhookInput,
    options?: RequestOptions,
  ): Promise<void> {
    await this.transport.postEmpty({
      auth: true,
      body: createSetWebhookBody(input),
      endpoint: setWebhookEndpoint,
      retryable: false,
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
  }
}
