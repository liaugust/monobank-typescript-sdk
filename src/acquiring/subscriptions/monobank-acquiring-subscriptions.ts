import type { RequestOptions } from "../../shared/request-options.js";
import { requestSignal } from "../../shared/request-options.js";
import type { MonobankTransport } from "../../transport/transport.js";
import type {
  CreateAcquiringSubscriptionInput,
  NewAcquiringSubscription,
} from "./create-subscription/create-subscription.js";
import {
  createAcquiringSubscriptionBody,
  createAcquiringSubscriptionEndpoint,
  newAcquiringSubscriptionSchema,
} from "./create-subscription/create-subscription.js";
import type { EditAcquiringSubscriptionInput } from "./edit-subscription/edit-subscription.js";
import {
  createEditAcquiringSubscriptionBody,
  editAcquiringSubscriptionEndpoint,
} from "./edit-subscription/edit-subscription.js";
import type { GetAcquiringSubscriptionPaymentsInput } from "./get-subscription-payments/get-subscription-payments.js";
import { createAcquiringSubscriptionPaymentsEndpoint } from "./get-subscription-payments/get-subscription-payments.js";
import type { GetAcquiringSubscriptionStatusInput } from "./get-subscription-status/get-subscription-status.js";
import { createAcquiringSubscriptionStatusEndpoint } from "./get-subscription-status/get-subscription-status.js";
import type { ListAcquiringSubscriptionsInput } from "./list-subscriptions/list-subscriptions.js";
import { createListAcquiringSubscriptionsEndpoint } from "./list-subscriptions/list-subscriptions.js";
import type { AcquiringSubscription } from "./models/acquiring-subscription.js";
import { acquiringSubscriptionSchema } from "./models/acquiring-subscription.js";
import type { AcquiringSubscriptionList } from "./models/acquiring-subscription-list.js";
import { acquiringSubscriptionListSchema } from "./models/acquiring-subscription-list.js";
import type { AcquiringSubscriptionPaymentList } from "./models/acquiring-subscription-payment.js";
import { acquiringSubscriptionPaymentListSchema } from "./models/acquiring-subscription-payment.js";
import type { RemoveAcquiringSubscriptionInput } from "./remove-subscription/remove-subscription.js";
import {
  createRemoveAcquiringSubscriptionBody,
  removeAcquiringSubscriptionEndpoint,
} from "./remove-subscription/remove-subscription.js";

/** Acquiring recurring-payment operations for subscriptions and their charges. */
export class MonobankAcquiringSubscriptions {
  private readonly transport: MonobankTransport;

  /**
   * Creates the subscription resource over the parent client's authenticated transport.
   * @param transport Shared Acquiring transport owned by `MonobankAcquiringClient`.
   */
  public constructor(transport: MonobankTransport) {
    this.transport = transport;
  }

  /**
   * Cancels a subscription, optionally refunding part of what it has charged.
   *
   * Monobank documents `cancel` as the only action, and returns an empty
   * success payload, so this method resolves to `undefined`. Omitting
   * `refundAmount` cancels without refunding. The request mutates merchant
   * state and is therefore never retried, even when the parent client has a
   * retry policy. A provided `RequestOptions.signal` cancels the active
   * attempt.
   * @example
   * ```ts
   * await client.subscriptions.edit({
   *   action: AcquiringSubscriptionAction.Cancel,
   *   subscriptionId: "s2_AbrCdXyZ13",
   * });
   * ```
   * @param input Action, subscription identifier, and optional refund amount.
   * @param options Optional cancellation controls for this request.
   * @returns Nothing; Monobank acknowledges the change with an empty payload.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status, including an unknown subscription.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankValidationError} When the action is undocumented, the identifier is blank, or the refund amount is not an integer.
   */
  public async edit(
    input: EditAcquiringSubscriptionInput,
    options?: RequestOptions,
  ): Promise<void> {
    await this.transport.postEmpty({
      auth: true,
      body: createEditAcquiringSubscriptionBody(input),
      endpoint: editAcquiringSubscriptionEndpoint,
      retryable: false,
      ...requestSignal(options),
    });
  }

  /**
   * Creates a subscription and returns the page where the payer authorizes it.
   *
   * The first payment happens on the returned `pageUrl`; later charges are
   * taken by Monobank on the `interval` cadence. Amounts are minor currency
   * units. The request mutates merchant state and is therefore never retried,
   * even when the parent client has a retry policy. A provided
   * `RequestOptions.signal` cancels the active attempt.
   * @example
   * ```ts
   * const subscription = await client.subscriptions.create({
   *   amount: 4_200,
   *   interval: "1m",
   * });
   * ```
   * @param input Amount, cadence, and optional currency, redirect, webhook, and validity settings.
   * @param options Optional cancellation controls for this request.
   * @returns Validated subscription identifier and first payment-page URL.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the new-subscription schema.
   * @throws {MonobankValidationError} When a documented field has an invalid shape or `interval` is malformed.
   */
  public async create(
    input: CreateAcquiringSubscriptionInput,
    options?: RequestOptions,
  ): Promise<NewAcquiringSubscription> {
    return await this.transport.postJson({
      auth: true,
      body: createAcquiringSubscriptionBody(input),
      endpoint: createAcquiringSubscriptionEndpoint,
      retryable: false,
      schema: newAcquiringSubscriptionSchema,
      ...requestSignal(options),
    });
  }

  /**
   * Reads the charges Monobank has taken against one subscription.
   *
   * `dateFrom` is required by Monobank and bounds the window; amounts are minor
   * currency units. This safe authenticated GET is retried only when the parent
   * client has a bounded retry policy. A provided `RequestOptions.signal`
   * cancels the active attempt or retry delay.
   * @example
   * ```ts
   * const history = await client.subscriptions.getPayments({
   *   dateFrom: new Date("2024-06-01T00:00:00Z"),
   *   subscriptionId: "s2_AbrCdXyZ13",
   * });
   * ```
   * @param input Subscription identifier, window, and paging values.
   * @param options Optional cancellation controls for this request.
   * @returns Validated page of charges taken against the subscription.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status, including an unknown subscription.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the charge-history schema.
   * @throws {MonobankValidationError} When the identifier, window, or paging values are invalid.
   */
  public async getPayments(
    input: GetAcquiringSubscriptionPaymentsInput,
    options?: RequestOptions,
  ): Promise<AcquiringSubscriptionPaymentList> {
    const endpoint = createAcquiringSubscriptionPaymentsEndpoint(input);

    return await this.transport.getJson({
      auth: true,
      endpoint,
      retryable: true,
      schema: acquiringSubscriptionPaymentListSchema,
      ...requestSignal(options),
    });
  }

  /**
   * Loads the current state of one subscription.
   *
   * Monobank documents this response with a sample rather than a schema, so
   * only `subscriptionId` and `status` are guaranteed: `endDate` and
   * `cancellationDesc` appear once a subscription ends, and `walletData` once a
   * card is attached. `walletData.cardToken` authorizes further charges, so
   * treat it as credential material. This safe authenticated GET is retried
   * only when the parent client has a bounded retry policy. A provided
   * `RequestOptions.signal` cancels the active attempt or retry delay.
   * @example
   * ```ts
   * const subscription = await client.subscriptions.getStatus({
   *   subscriptionId: "s2_AbrCdXyZ13",
   * });
   * ```
   * @param input Subscription identifier.
   * @param options Optional cancellation controls for this request.
   * @returns Validated state of the subscription.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status, including an unknown subscription.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the subscription schema.
   * @throws {MonobankValidationError} When `subscriptionId` is not a nonempty string without surrounding whitespace.
   */
  public async getStatus(
    input: GetAcquiringSubscriptionStatusInput,
    options?: RequestOptions,
  ): Promise<AcquiringSubscription> {
    const endpoint = createAcquiringSubscriptionStatusEndpoint(input);

    return await this.transport.getJson({
      auth: true,
      endpoint,
      retryable: true,
      schema: acquiringSubscriptionSchema,
      ...requestSignal(options),
    });
  }

  /**
   * Lists the merchant's subscriptions inside a window.
   *
   * `dateFrom` is required by Monobank, and `status` narrows the page to active
   * or cancelled subscriptions. This safe authenticated GET is retried only
   * when the parent client has a bounded retry policy. A provided
   * `RequestOptions.signal` cancels the active attempt or retry delay.
   * @example
   * ```ts
   * const page = await client.subscriptions.list({
   *   dateFrom: new Date("2024-06-01T00:00:00Z"),
   *   status: AcquiringSubscriptionStatus.Active,
   * });
   * ```
   * @param input Window, paging, and optional lifecycle filter.
   * @param options Optional cancellation controls for this request.
   * @returns Validated page of the merchant's subscriptions.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the subscription-list schema.
   * @throws {MonobankValidationError} When the window, paging values, or `status` filter is invalid.
   */
  public async list(
    input: ListAcquiringSubscriptionsInput,
    options?: RequestOptions,
  ): Promise<AcquiringSubscriptionList> {
    const endpoint = createListAcquiringSubscriptionsEndpoint(input);

    return await this.transport.getJson({
      auth: true,
      endpoint,
      retryable: true,
      schema: acquiringSubscriptionListSchema,
      ...requestSignal(options),
    });
  }

  /**
   * Deactivates a subscription so Monobank takes no further charges.
   *
   * Monobank returns an empty success payload, so this method resolves to
   * `undefined`. Use `edit()` instead when the cancellation should also refund.
   * The request mutates merchant state and is therefore never retried, even
   * when the parent client has a retry policy. A provided
   * `RequestOptions.signal` cancels the active attempt.
   * @example
   * ```ts
   * await client.subscriptions.remove({ subscriptionId: "s2_AbrCdXyZ13" });
   * ```
   * @param input Subscription identifier.
   * @param options Optional cancellation controls for this request.
   * @returns Nothing; Monobank acknowledges the deactivation with an empty payload.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status, including an unknown subscription.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankValidationError} When `subscriptionId` is not a nonempty string without surrounding whitespace.
   */
  public async remove(
    input: RemoveAcquiringSubscriptionInput,
    options?: RequestOptions,
  ): Promise<void> {
    await this.transport.postEmpty({
      auth: true,
      body: createRemoveAcquiringSubscriptionBody(input),
      endpoint: removeAcquiringSubscriptionEndpoint,
      retryable: false,
      ...requestSignal(options),
    });
  }
}
