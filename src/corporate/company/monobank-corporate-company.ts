import type { RequestOptions } from "../../shared/request-options.js";
import type { MonobankTransport } from "../../transport/transport.js";
import type {
  CorporateRegistrationStatusResult,
  GetCorporateRegistrationStatusInput,
} from "./get-registration-status/get-registration-status.js";
import {
  corporateRegistrationStatusEndpoint,
  corporateRegistrationStatusSchema,
  parseGetCorporateRegistrationStatusInput,
} from "./get-registration-status/get-registration-status.js";
import type {
  CorporateSettings,
  GetCorporateSettingsInput,
} from "./get-settings/get-settings.js";
import {
  corporateSettingsEndpoint,
  corporateSettingsSchema,
  parseGetCorporateSettingsInput,
} from "./get-settings/get-settings.js";
import type {
  CorporateRegistration,
  RegisterCorporateCompanyInput,
} from "./register/register.js";
import {
  corporateRegistrationSchema,
  parseRegisterCorporateCompanyInput,
  registerCorporateCompanyEndpoint,
} from "./register/register.js";
import type { SetCorporateWebhookInput } from "./set-webhook/set-webhook.js";
import {
  parseSetCorporateWebhookInput,
  setCorporateWebhookEndpoint,
} from "./set-webhook/set-webhook.js";

/** Company registration, settings, and webhook operations for a Corporate provider. */
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
   * Submits the company authorization application to Monobank.
   *
   * Runs before a service key exists, so the request is signed with `X-Time`
   * and the URL only and sends no `X-Key-Id`. Mutating request; never retried.
   * @param input Company details, including the base64 secp256k1 public key PEM.
   * @param options Optional cancellation controls for this request.
   * @returns Validated application acknowledgement; Monobank documents no required field on it.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the registration schema.
   * @throws {MonobankValidationError} When a required field is blank or the configured signer fails.
   */
  public async register(
    input: RegisterCorporateCompanyInput,
    options?: RequestOptions,
  ): Promise<CorporateRegistration> {
    const body = parseRegisterCorporateCompanyInput(input);

    return await this.transport.postJson({
      auth: true,
      body,
      endpoint: registerCorporateCompanyEndpoint,
      retryable: false,
      schema: corporateRegistrationSchema,
      signature: { preRegistration: true, variant: "time-and-url" },
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
  }

  /**
   * Polls the status of a submitted authorization application.
   *
   * Runs before a service key exists, so the request is signed with `X-Time`
   * and the URL only and sends no `X-Key-Id`. The returned `keyId` is what
   * every later Corporate request authenticates with. POST upstream; never
   * retried.
   * @param input Public key PEM identifying the application.
   * @param options Optional cancellation controls for this request.
   * @returns Validated application status and, once approved, the issued key identifier.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the status schema.
   * @throws {MonobankValidationError} When `pubkey` is blank or the configured signer fails.
   */
  public async getRegistrationStatus(
    input: GetCorporateRegistrationStatusInput,
    options?: RequestOptions,
  ): Promise<CorporateRegistrationStatusResult> {
    const body = parseGetCorporateRegistrationStatusInput(input);

    return await this.transport.postJson({
      auth: true,
      body,
      endpoint: corporateRegistrationStatusEndpoint,
      retryable: false,
      schema: corporateRegistrationStatusSchema,
      signature: { preRegistration: true, variant: "time-and-url" },
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
  }

  /**
   * Sets or removes the webhook receiving client payment updates.
   *
   * Monobank sends a test POST to the URL during this call and fails the call
   * unless it answers 200 OK. Signed with the `X-Time` and URL payload;
   * `X-Request-Id` is sent but deliberately not signed. Mutating request;
   * never retried. Removal via an empty string mirrors the Personal endpoint
   * and is not explicitly documented for this one.
   * @param input Request identifier and webhook address, or an empty string to remove it.
   * @param options Optional cancellation controls for this request.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status, including a failed test POST.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankValidationError} When the URL or request identifier is invalid, no key is configured, or the signer fails.
   */
  public async setWebhook(
    input: SetCorporateWebhookInput,
    options?: RequestOptions,
  ): Promise<void> {
    const parsed = parseSetCorporateWebhookInput(input);

    await this.transport.postEmpty({
      auth: true,
      body: parsed.body,
      endpoint: setCorporateWebhookEndpoint,
      retryable: false,
      signature: { requestId: parsed.requestId, variant: "time-and-url" },
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
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
