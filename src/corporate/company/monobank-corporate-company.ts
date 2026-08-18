import type { RequestOptions } from "../../shared/request-options.js";
import type { MonobankTransport } from "../../transport/transport.js";
import type {
  CorporateSettings,
  GetCorporateSettingsInput,
} from "./get-settings/get-settings.js";
import {
  corporateSettingsEndpoint,
  corporateSettingsSchema,
  parseGetCorporateSettingsInput,
} from "./get-settings/get-settings.js";

/** Company registration and settings operations available to an approved Corporate key. */
export class MonobankCorporateCompany {
  private readonly transport: MonobankTransport;

  /**
   * Creates the company resource over the parent client's signed transport.
   * @param transport Shared Corporate transport owned by `MonobankCorporateClient`.
   */
  public constructor(transport: MonobankTransport) {
    this.transport = transport;
  }

  /**
   * Loads the company data Monobank holds for the configured Corporate key.
   *
   * Signed with the `X-Time` and URL payload; `X-Request-Id` is sent but
   * deliberately not signed, as Monobank documents for this endpoint.
   * @param input Request identifier sent as `X-Request-Id`.
   * @param options Optional cancellation controls for this request.
   * @returns Validated company name, permissions, logo, public key, and webhook address.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the settings schema.
   * @throws {MonobankValidationError} When `requestId` is invalid or the configured signer fails.
   */
  public async getSettings(
    input: GetCorporateSettingsInput,
    options?: RequestOptions,
  ): Promise<CorporateSettings> {
    const parsed = parseGetCorporateSettingsInput(input);

    return await this.transport.getJson({
      auth: true,
      endpoint: corporateSettingsEndpoint,
      retryable: true,
      schema: corporateSettingsSchema,
      signature: { requestId: parsed.requestId, variant: "time-and-url" },
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
  }
}
