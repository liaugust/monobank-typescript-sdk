import type { RequestOptions } from "../../shared/request-options.js";
import type { MonobankTransport } from "../../transport/transport.js";
import type {
  InstallmentsClientPresence,
  InstallmentsClientValidation,
  ValidateInstallmentsClientInput,
} from "./validate-client/validate-client.js";
import {
  createValidateInstallmentsClientBody,
  installmentsClientPresenceSchema,
  installmentsClientValidationSchema,
  validateInstallmentsClientEndpoint,
  validateInstallmentsClientV2Endpoint,
} from "./validate-client/validate-client.js";

/** Покупка Частинами client-eligibility lookups. */
export class MonobankInstallmentsClients {
  private readonly transport: MonobankTransport;

  /**
   * Creates the client-lookup resource over the parent client's signed transport.
   * @param transport Shared installments transport owned by `MonobankInstallmentsClient`.
   */
  public constructor(transport: MonobankTransport) {
    this.transport = transport;
  }

  /**
   * Checks whether a phone number belongs to a Monobank client, with identity.
   *
   * A found client's name and tax identifier come back in `client`, so this is a
   * personal-data read: never log or persist the block, and prefer
   * `validateV2()` when only the yes-or-no answer is needed. The request carries
   * a phone number rather than changing state, but it is a POST and is therefore
   * never retried automatically. A provided `RequestOptions.signal` cancels the
   * active attempt.
   * @example
   * ```ts
   * const lookup = await client.clients.validate({ phone: "+380501234567" });
   * ```
   * @param input Client phone number in international format.
   * @param options Optional cancellation controls for this request.
   * @returns Validated lookup answer, including identity when found.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status, including 401 for a bad signature.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the lookup schema.
   * @throws {MonobankValidationError} When the phone number is not in international format.
   */
  public async validate(
    input: ValidateInstallmentsClientInput,
    options?: RequestOptions,
  ): Promise<InstallmentsClientValidation> {
    return await this.transport.postJson({
      auth: true,
      body: createValidateInstallmentsClientBody(
        input,
        validateInstallmentsClientEndpoint,
      ),
      endpoint: validateInstallmentsClientEndpoint,
      retryable: false,
      schema: installmentsClientValidationSchema,
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
  }

  /**
   * Checks whether a phone number belongs to a Monobank client, answer only.
   *
   * Prefer this over `validate()`: Monobank returns `found` alone, so no name or
   * tax identifier crosses the wire when the caller only needs eligibility. The
   * request is never retried automatically. A provided `RequestOptions.signal`
   * cancels the active attempt.
   * @example
   * ```ts
   * const { found } = await client.clients.validateV2({
   *   phone: "+380501234567",
   * });
   * ```
   * @param input Client phone number in international format.
   * @param options Optional cancellation controls for this request.
   * @returns Validated presence answer without identity data.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status, including 401 for a bad signature.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the presence schema.
   * @throws {MonobankValidationError} When the phone number is not in international format.
   */
  public async validateV2(
    input: ValidateInstallmentsClientInput,
    options?: RequestOptions,
  ): Promise<InstallmentsClientPresence> {
    return await this.transport.postJson({
      auth: true,
      body: createValidateInstallmentsClientBody(
        input,
        validateInstallmentsClientV2Endpoint,
      ),
      endpoint: validateInstallmentsClientV2Endpoint,
      retryable: false,
      schema: installmentsClientPresenceSchema,
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
    });
  }
}
