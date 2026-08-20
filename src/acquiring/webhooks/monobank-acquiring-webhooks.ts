import type { RequestOptions } from "../../shared/request-options.js";
import { requestSignal } from "../../shared/request-options.js";
import type { MonobankTransport } from "../../transport/transport.js";
import type { AcquiringWebhookPublicKey } from "./get-public-key/get-public-key.js";
import {
  acquiringWebhookPublicKeySchema,
  getAcquiringWebhookPublicKeyEndpoint,
} from "./get-public-key/get-public-key.js";

/** Acquiring webhook authentication operations. */
export class MonobankAcquiringWebhooks {
  private readonly transport: MonobankTransport;

  /**
   * Creates the webhook resource over the parent client's authenticated transport.
   * @param transport Shared Acquiring transport owned by `MonobankAcquiringClient`.
   */
  public constructor(transport: MonobankTransport) {
    this.transport = transport;
  }

  /**
   * Loads the ECDSA public key used to authenticate Acquiring webhook signatures.
   * @param options Optional cancellation controls for this request.
   * @returns The authenticated webhook public key response.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the public-key schema.
   * @throws {MonobankValidationError} When request configuration is invalid before Fetch runs.
   */
  public getPublicKey(
    options?: RequestOptions,
  ): Promise<AcquiringWebhookPublicKey> {
    return this.transport.getJson({
      auth: true,
      endpoint: getAcquiringWebhookPublicKeyEndpoint,
      retryable: true,
      schema: acquiringWebhookPublicKeySchema,
      ...requestSignal(options),
    });
  }
}
