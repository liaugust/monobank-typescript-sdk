import type { ClientInfo } from "../../personal/client-info/get-info/get-info.js";
import { clientInfoSchema } from "../../personal/client-info/get-info/get-info.js";
import type { StatementItem } from "../../personal/statements/models/statement-item.js";
import { statementItemsSchema } from "../../personal/statements/models/statement-item.js";
import type { RequestOptions } from "../../shared/request-options.js";
import { requestSignal } from "../../shared/request-options.js";
import type { MonobankTransport } from "../../transport/transport.js";
import type { GetCorporateClientInfoInput } from "./get-client-info/get-client-info.js";
import {
  corporateClientInfoEndpoint,
  parseGetCorporateClientInfoInput,
} from "./get-client-info/get-client-info.js";
import type { GetCorporateClientStatementsInput } from "./get-client-statements/get-client-statements.js";
import { parseGetCorporateClientStatementsInput } from "./get-client-statements/get-client-statements.js";

/**
 * Reads of a granted client's own banking data.
 *
 * These address the same URLs the Personal client uses, but they are different
 * operations: the data belongs to another person, authentication is a Corporate
 * signature rather than a Personal token, and every call depends on a grant that
 * client can revoke. A revoked or unapproved grant surfaces as
 * `MonobankApiError`.
 */
export class MonobankCorporateClients {
  private readonly transport: MonobankTransport;

  /**
   * Creates the delegated-read resource over the parent client's signed transport.
   * @param transport Shared Corporate transport owned by `MonobankCorporateClient`.
   */
  public constructor(transport: MonobankTransport) {
    this.transport = transport;
  }

  /**
   * Loads the granted client's identity and accounts.
   *
   * Signed with the `X-Time`, `X-Request-Id`, and URL payload. Safe GET;
   * eligible for configured retries. Monobank limits this endpoint to one
   * request per 60 seconds, so a configured retry policy that includes `429`
   * spends more of an already-exhausted quota rather than helping: pass
   * `retryableStatusCodes: [500, 502, 503, 504]` for a client that paces
   * itself against this limit.
   * @param input Grant identifier from `access.request()`.
   * @param options Optional cancellation controls for this request.
   * @returns Validated client identity, accounts, and any jars the grant exposes.
   * @throws {MonobankApiError} When the grant is unapproved or revoked, or another non-success status is returned.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the client-info schema.
   * @throws {MonobankValidationError} When the identifier is invalid, no key is configured, or the signer fails.
   */
  public async getInfo(
    input: GetCorporateClientInfoInput,
    options?: RequestOptions,
  ): Promise<ClientInfo> {
    const parsed = parseGetCorporateClientInfoInput(input);

    return await this.transport.getJson({
      auth: true,
      endpoint: corporateClientInfoEndpoint,
      retryable: true,
      schema: clientInfoSchema,
      signature: {
        requestId: parsed.requestId,
        variant: "time-request-id-and-url",
      },
      ...requestSignal(options),
    });
  }

  /**
   * Loads the granted client's statements for one account and window.
   *
   * The account defaults to `0`, the default UAH account, and the inclusive
   * window must not exceed 2,682,000 seconds. Signed with the `X-Time`,
   * `X-Request-Id`, and URL payload, which covers the encoded account and both
   * timestamps. Safe GET; eligible for configured retries. This targets the
   * same `/personal/statement` endpoint the Personal client uses, which
   * Monobank limits to one request per 60 seconds, so a configured retry
   * policy that includes `429` spends more of an already-exhausted quota
   * rather than helping: pass `retryableStatusCodes: [500, 502, 503, 504]`
   * for a client that paces itself against this limit.
   * @param input Grant identifier, account, and Unix-second or `Date` window.
   * @param options Optional cancellation controls for this request.
   * @returns Validated transactions, newest first.
   * @throws {MonobankApiError} When the grant is unapproved or revoked, or another non-success status is returned.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the statement schema.
   * @throws {MonobankValidationError} When the identifier, account, or window is invalid, no key is configured, or the signer fails.
   */
  public async getStatements(
    input: GetCorporateClientStatementsInput,
    options?: RequestOptions,
  ): Promise<readonly StatementItem[]> {
    const parsed = parseGetCorporateClientStatementsInput(input);

    return await this.transport.getJson({
      auth: true,
      endpoint: parsed.endpoint,
      retryable: true,
      schema: statementItemsSchema,
      signature: {
        requestId: parsed.requestId,
        variant: "time-request-id-and-url",
      },
      ...requestSignal(options),
    });
  }
}
