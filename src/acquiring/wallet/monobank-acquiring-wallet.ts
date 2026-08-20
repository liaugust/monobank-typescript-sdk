import type { RequestOptions } from "../../shared/request-options.js";
import { requestSignal } from "../../shared/request-options.js";
import type { MonobankTransport } from "../../transport/transport.js";
import type { AcquiringCardPayment } from "../shared/models/card-payment.js";
import { acquiringCardPaymentSchema } from "../shared/models/card-payment.js";
import type { DeleteAcquiringWalletCardInput } from "./delete-wallet-card/delete-wallet-card.js";
import { createDeleteAcquiringWalletCardEndpoint } from "./delete-wallet-card/delete-wallet-card.js";
import type { ListAcquiringWalletCardsInput } from "./list-wallet-cards/list-wallet-cards.js";
import { createAcquiringWalletEndpoint } from "./list-wallet-cards/list-wallet-cards.js";
import type { AcquiringWallet } from "./models/wallet-card.js";
import { acquiringWalletSchema } from "./models/wallet-card.js";
import type { PayWithCardTokenInput } from "./pay-with-card-token/pay-with-card-token.js";
import {
  createPayWithCardTokenBody,
  payWithCardTokenEndpoint,
} from "./pay-with-card-token/pay-with-card-token.js";

/** Acquiring operations over cards tokenized into a merchant wallet. */
export class MonobankAcquiringWallet {
  private readonly transport: MonobankTransport;

  /**
   * Creates the wallet resource over the parent client's authenticated transport.
   * @param transport Shared Acquiring transport owned by `MonobankAcquiringClient`.
   */
  public constructor(transport: MonobankTransport) {
    this.transport = transport;
  }

  /**
   * Lists the cards tokenized into one payer's merchant wallet.
   *
   * Monobank enables tokenization per merchant, so this answers only for
   * merchants with the feature switched on. This safe authenticated GET is
   * retried only when the parent client has a bounded retry policy. A provided
   * `RequestOptions.signal` cancels the active attempt or retry delay.
   * @example
   * ```ts
   * const wallet = await client.wallet.list({ walletId: "wallet-42" });
   * ```
   * @param input Wallet identifier assigned by the merchant.
   * @param options Optional cancellation controls for this request.
   * @returns Validated wallet response listing tokenized cards.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the wallet schema.
   * @throws {MonobankValidationError} When `walletId` is missing or empty, rejected before Fetch runs.
   */
  public async list(
    input: ListAcquiringWalletCardsInput,
    options?: RequestOptions,
  ): Promise<AcquiringWallet> {
    const endpoint = createAcquiringWalletEndpoint(input);

    return await this.transport.getJson({
      auth: true,
      endpoint,
      retryable: true,
      schema: acquiringWalletSchema,
      ...requestSignal(options),
    });
  }

  /**
   * Charges a card previously tokenized into a merchant wallet.
   *
   * Amounts are integer minor currency units. When Monobank requires 3-D
   * Secure the result carries `tdsUrl`, and the payer must complete
   * authentication there before the payment reaches a final status. This
   * request moves money and is never retried, even when the parent client has
   * a retry policy.
   * @example
   * ```ts
   * const payment = await client.wallet.pay({
   *   amount: 4_200,
   *   cardToken: "card-token-42",
   *   ccy: 980,
   *   initiationKind: AcquiringPaymentInitiationKind.Client,
   * });
   * ```
   * @param input Card token, amount, currency, and initiation controls.
   * @param options Optional cancellation controls for this request.
   * @returns Validated payment result, including `tdsUrl` when 3-D Secure is required.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the card-payment schema.
   * @throws {MonobankValidationError} When the input does not match the documented request contract, rejected before Fetch runs.
   */
  public async pay(
    input: PayWithCardTokenInput,
    options?: RequestOptions,
  ): Promise<AcquiringCardPayment> {
    const body = createPayWithCardTokenBody(input);

    return await this.transport.postJson({
      auth: true,
      body,
      endpoint: payWithCardTokenEndpoint,
      retryable: false,
      schema: acquiringCardPaymentSchema,
      ...requestSignal(options),
    });
  }

  /**
   * Removes a tokenized card from a merchant wallet.
   *
   * Monobank acknowledges the removal with an empty payload, so this resolves
   * to `undefined`. The request mutates stored payer data and is never
   * retried, even when the parent client has a retry policy.
   * @example
   * ```ts
   * await client.wallet.deleteCard({ cardToken: "card-token-42" });
   * ```
   * @param input Card token to remove.
   * @param options Optional cancellation controls for this request.
   * @returns Nothing; Monobank acknowledges the removal with an empty payload.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankValidationError} When `cardToken` is missing or empty, rejected before Fetch runs.
   */
  public async deleteCard(
    input: DeleteAcquiringWalletCardInput,
    options?: RequestOptions,
  ): Promise<void> {
    const endpoint = createDeleteAcquiringWalletCardEndpoint(input);

    await this.transport.deleteEmpty({
      auth: true,
      endpoint,
      retryable: false,
      ...requestSignal(options),
    });
  }
}
