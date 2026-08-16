import { MonobankTransport } from "../transport/transport.js";
import type { ClientInfo } from "./client-info.js";
import { clientInfoSchema } from "./client-info.js";
import type {
  GetStatementsInput,
  UnixTimeInput,
} from "./get-statements-input.js";
import { createStatementsEndpoint } from "./get-statements-input.js";
import type { MonobankPersonalClientOptions } from "./monobank-personal-client-options.js";
import type { RequestOptions } from "./request-options.js";
import type { SetWebhookInput } from "./set-webhook-input.js";
import { createSetWebhookBody } from "./set-webhook-input.js";
import type { StatementItem } from "./statement-item.js";
import { statementItemsSchema } from "./statement-item.js";

/**
 * Client for Monobank Personal API endpoints with injected Fetch support for tests, proxies, and nonstandard runtimes.
 * @example
 * ```ts
 * const client = new MonobankPersonalClient({
 *   fetch: globalThis.fetch,
 *   token: "personal-token",
 * });
 * const profile = await client.getClientInfo();
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

  /**
   * Loads account or jar statements for an explicit Monobank time window.
   *
   * `Date` inputs are normalized to Unix seconds; numeric inputs must already
   * be finite nonnegative Unix-second integers. The statement window is not
   * split or delayed by the SDK: Monobank's inclusive maximum is 2,682,000
   * seconds, and this endpoint is limited to one request per 60 seconds. This
   * authenticated safe GET is retried only when a bounded retry policy is
   * supplied to the constructor. A provided `RequestOptions.signal` cancels
   * the active Fetch attempt and any retry delay.
   * @example
   * ```ts
   * const statements = await client.getStatements({
   *   account: "0",
   *   from: new Date("2026-08-01T00:00:00.000Z"),
   *   to: new Date("2026-08-02T00:00:00.000Z"),
   * });
   * ```
   * @param input Account or jar identifier plus statement window.
   * @param options Optional cancellation controls for this request.
   * @returns Validated statement items with monetary values in minor currency units.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the statement schema.
   * @throws {MonobankValidationError} When account or time-window input is invalid before Fetch runs.
   */
  public async getStatements(
    input: GetStatementsInput,
    options?: RequestOptions,
  ): Promise<readonly StatementItem[]> {
    return await this.transport.getJson({
      auth: true,
      endpoint: createStatementsEndpoint(createStatementRequestInput(input)),
      retryable: true,
      schema: statementItemsSchema,
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
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

function createStatementRequestInput(
  input: GetStatementsInput,
): GetStatementsInput {
  const from: UnixTimeInput = input.from;

  if (input.to === undefined) {
    return {
      ...(input.account === undefined ? {} : { account: input.account }),
      from,
    };
  }

  const to: UnixTimeInput = input.to;

  return {
    ...(input.account === undefined ? {} : { account: input.account }),
    from,
    to,
  };
}
