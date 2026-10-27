import type { RequestOptions } from "../../shared/request-options.js";
import { requestSignal } from "../../shared/request-options.js";
import type { MonobankTransport } from "../../transport/transport.js";
import type { CancelInstallmentsQrCartInput } from "./cancel-cart/cancel-cart.js";
import {
  cancelInstallmentsQrCartEndpoint,
  createCancelInstallmentsQrCartBody,
} from "./cancel-cart/cancel-cart.js";
import type { CreateInstallmentsQrCartInput } from "./create-cart/create-cart.js";
import {
  createInstallmentsQrCartBody,
  createInstallmentsQrCartEndpoint,
} from "./create-cart/create-cart.js";
import type { InstallmentsQrCart } from "./models/installments-qr-cart.js";
import { installmentsQrCartSchema } from "./models/installments-qr-cart.js";

/** Store-authenticated Покупка Частинами QR cart operations. */
export class MonobankInstallmentsQr {
  private readonly transport: MonobankTransport;

  /**
   * Creates the QR cart resource over the parent's HMAC transport.
   * @param transport Shared Installments transport owned by the parent client.
   */
  public constructor(transport: MonobankTransport) {
    this.transport = transport;
  }

  /**
   * Creates a store-owned QR cart on `u2.monobank.com.ua` with store-id and HMAC.
   *
   * Product prices are hryvnia decimals and fields retain snake_case. The POST
   * is never automatically retried. A signal cancels the active attempt. No
   * endpoint-specific rate limit is documented. Protect callback delivery separately.
   * @param input QR identifier, UUID order, products, and HTTP callback URL.
   * @param options Optional cancellation controls.
   * @returns Validated 201 response with optional UUID `id` and additive fields.
   * @throws {MonobankValidationError} When input is invalid before Fetch.
   * @throws {MonobankApiError} When Monobank rejects the request or signature.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or is aborted.
   * @throws {MonobankResponseValidationError} When the success payload is invalid.
   */
  public async createCart(
    input: CreateInstallmentsQrCartInput,
    options?: RequestOptions,
  ): Promise<InstallmentsQrCart> {
    return await this.transport.postJson({
      auth: true,
      body: createInstallmentsQrCartBody(input),
      endpoint: createInstallmentsQrCartEndpoint,
      retryable: false,
      schema: installmentsQrCartSchema,
      ...requestSignal(options),
    });
  }

  /**
   * Cancels a store-owned QR cart using store-id and HMAC on `u2.monobank.com.ua`.
   *
   * The POST is never automatically retried. A signal cancels the active attempt.
   * No endpoint-specific rate limit is documented; success has no response model.
   * @param input QR identifier belonging to the authenticated store.
   * @param options Optional cancellation controls.
   * @returns Resolves when Monobank acknowledges cancellation with HTTP 200.
   * @throws {MonobankValidationError} When input is invalid before Fetch.
   * @throws {MonobankApiError} When Monobank rejects the request or signature.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or is aborted.
   */
  public async cancelCart(
    input: CancelInstallmentsQrCartInput,
    options?: RequestOptions,
  ): Promise<void> {
    await this.transport.postEmpty({
      auth: true,
      body: createCancelInstallmentsQrCartBody(input),
      endpoint: cancelInstallmentsQrCartEndpoint,
      retryable: false,
      ...requestSignal(options),
    });
  }
}
