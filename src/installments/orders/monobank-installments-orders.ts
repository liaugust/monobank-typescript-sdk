import type { RequestOptions } from "../../shared/request-options.js";
import { requestSignal } from "../../shared/request-options.js";
import type { MonobankTransport } from "../../transport/transport.js";
import type { InstallmentsOrderPayment } from "./check-order-paid/check-order-paid.js";
import {
  checkInstallmentsOrderPaidEndpoint,
  installmentsOrderPaymentSchema,
} from "./check-order-paid/check-order-paid.js";
import { confirmInstallmentsOrderEndpoint } from "./confirm-order/confirm-order.js";
import type {
  CreateInstallmentsOrderInput,
  NewInstallmentsOrder,
} from "./create-order/create-order.js";
import {
  createInstallmentsOrderBody,
  createInstallmentsOrderEndpoint,
  newInstallmentsOrderSchema,
} from "./create-order/create-order.js";
import {
  getInstallmentsOrderDataEndpoint,
  getInstallmentsOrderInfoEndpoint,
} from "./get-order-data/get-order-data.js";
import { getInstallmentsOrderStateEndpoint } from "./get-order-state/get-order-state.js";
import type { InstallmentsOrderData } from "./models/installments-order-data.js";
import { installmentsOrderDataSchema } from "./models/installments-order-data.js";
import type { InstallmentsOrderState } from "./models/installments-order-state.js";
import { installmentsOrderStateSchema } from "./models/installments-order-state.js";
import { rejectInstallmentsOrderEndpoint } from "./reject-order/reject-order.js";
import type {
  InstallmentsOrderReturn,
  ReturnInstallmentsOrderInput,
} from "./return-order/return-order.js";
import {
  createReturnInstallmentsOrderBody,
  installmentsOrderReturnSchema,
  returnInstallmentsOrderEndpoint,
} from "./return-order/return-order.js";
import type { InstallmentsOrderIdentifierInput } from "./shared/order-identifier.js";
import { parseInstallmentsOrderIdentifier } from "./shared/order-identifier.js";

/** Покупка Частинами order lifecycle operations. */
export class MonobankInstallmentsOrders {
  private readonly transport: MonobankTransport;

  /**
   * Creates the order resource over the parent client's signed transport.
   * @param transport Shared installments transport owned by `MonobankInstallmentsClient`.
   */
  public constructor(transport: MonobankTransport) {
    this.transport = transport;
  }

  /**
   * Reports whether an order is fully paid and refundable to the card.
   *
   * Read this before `returnGoods()`: `bank_can_return_money_to_card` says
   * whether a refund can go back to the card at all, rather than being handed
   * over as cash. Never retried automatically. A provided `RequestOptions.signal`
   * cancels the active attempt.
   * @example
   * ```ts
   * const payment = await client.orders.checkPaid({ order_id: orderId });
   * ```
   * @param input Order identifier.
   * @param options Optional cancellation controls for this request.
   * @returns Validated payment state of the order.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status, including 401 for a bad signature and 404 for an unknown order.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the payment schema.
   * @throws {MonobankValidationError} When `order_id` is not a UUID.
   */
  public async checkPaid(
    input: InstallmentsOrderIdentifierInput,
    options?: RequestOptions,
  ): Promise<InstallmentsOrderPayment> {
    return await this.transport.postJson({
      auth: true,
      body: parseInstallmentsOrderIdentifier(
        input,
        checkInstallmentsOrderPaidEndpoint,
      ),
      endpoint: checkInstallmentsOrderPaidEndpoint,
      retryable: false,
      schema: installmentsOrderPaymentSchema,
      ...requestSignal(options),
    });
  }

  /**
   * Confirms that the goods were released, activating the installment plan.
   *
   * Call this after handing the goods over, once `getState()` or a callback
   * reports `WAITING_FOR_STORE_CONFIRM`: Monobank documents that state as the
   * client having approved the credit. Until this call lands, the plan is not
   * active. Never retried automatically. A provided `RequestOptions.signal`
   * cancels the active attempt.
   * @example
   * ```ts
   * await client.orders.confirm({ order_id: orderId });
   * ```
   * @param input Order identifier.
   * @param options Optional cancellation controls for this request.
   * @returns Validated order state after confirmation.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status, including 401 for a bad signature and 404 for an unknown order.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the order-state schema.
   * @throws {MonobankValidationError} When `order_id` is not a UUID.
   */
  public async confirm(
    input: InstallmentsOrderIdentifierInput,
    options?: RequestOptions,
  ): Promise<InstallmentsOrderState> {
    return await this.transport.postJson({
      auth: true,
      body: parseInstallmentsOrderIdentifier(
        input,
        confirmInstallmentsOrderEndpoint,
      ),
      endpoint: confirmInstallmentsOrderEndpoint,
      retryable: false,
      schema: installmentsOrderStateSchema,
      ...requestSignal(options),
    });
  }

  /**
   * Creates an installment order for a client to approve in the Monobank app.
   *
   * `total_sum` and every product `sum` are hryvnia rather than minor units, so
   * `2499.99` is sent as written. Supplying `result_callback` asks Monobank to
   * post terminal outcomes back; intermediate states are never delivered that way
   * and need `getState()`. Never retried automatically, because a retry would
   * raise a second order against the same `store_order_id`. A provided
   * `RequestOptions.signal` cancels the active attempt.
   * @example
   * ```ts
   * const order = await client.orders.create({
   *   available_programs: [{ available_parts_count: [3, 6], type: "payment_installments" }],
   *   client_phone: "+380501234567",
   *   invoice: { date: "2024-01-15", number: "INV-1", source: "INTERNET" },
   *   products: [{ count: 1, name: "TV", sum: 2_499.99 }],
   *   store_order_id: "ORD-1",
   *   total_sum: 2_499.99,
   * });
   * ```
   * @param input Order, client, invoice, program, and product details.
   * @param options Optional cancellation controls for this request.
   * @returns Validated identifier of the created order.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status, including 401 for a bad signature.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the new-order schema.
   * @throws {MonobankValidationError} When a documented field is missing or malformed.
   */
  public async create(
    input: CreateInstallmentsOrderInput,
    options?: RequestOptions,
  ): Promise<NewInstallmentsOrder> {
    return await this.transport.postJson({
      auth: true,
      body: createInstallmentsOrderBody(input),
      endpoint: createInstallmentsOrderEndpoint,
      retryable: false,
      schema: newInstallmentsOrderSchema,
      ...requestSignal(options),
    });
  }

  /**
   * Reads the settlement details of one order.
   *
   * Monobank documents this response identically to `getInfo()`. `total_sum` and
   * each `reverse_list[].sum` are hryvnia rather than minor units, and `iban` and
   * `maskedCard` describe where the money moves, so treat both as payment data.
   * Never retried automatically. A provided `RequestOptions.signal` cancels the
   * active attempt.
   * @example
   * ```ts
   * const data = await client.orders.getData({ order_id: orderId });
   * ```
   * @param input Order identifier.
   * @param options Optional cancellation controls for this request.
   * @returns Validated settlement details of the order.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status, including 401 for a bad signature and 404 for an unknown order.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the order-data schema.
   * @throws {MonobankValidationError} When `order_id` is not a UUID.
   */
  public async getData(
    input: InstallmentsOrderIdentifierInput,
    options?: RequestOptions,
  ): Promise<InstallmentsOrderData> {
    return await this.transport.postJson({
      auth: true,
      body: parseInstallmentsOrderIdentifier(
        input,
        getInstallmentsOrderDataEndpoint,
      ),
      endpoint: getInstallmentsOrderDataEndpoint,
      retryable: false,
      schema: installmentsOrderDataSchema,
      ...requestSignal(options),
    });
  }

  /**
   * Reads the settlement details of one order from the `info` endpoint.
   *
   * Monobank documents `/api/order/info` and `/api/order/data` with identical
   * request and response shapes, so both are exposed rather than one being
   * guessed as an alias of the other. Prefer `getData()` unless an integration
   * was built against `info`.
   * @example
   * ```ts
   * const info = await client.orders.getInfo({ order_id: orderId });
   * ```
   * @param input Order identifier.
   * @param options Optional cancellation controls for this request.
   * @returns Validated settlement details of the order.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status, including 401 for a bad signature and 404 for an unknown order.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the order-data schema.
   * @throws {MonobankValidationError} When `order_id` is not a UUID.
   */
  public async getInfo(
    input: InstallmentsOrderIdentifierInput,
    options?: RequestOptions,
  ): Promise<InstallmentsOrderData> {
    return await this.transport.postJson({
      auth: true,
      body: parseInstallmentsOrderIdentifier(
        input,
        getInstallmentsOrderInfoEndpoint,
      ),
      endpoint: getInstallmentsOrderInfoEndpoint,
      retryable: false,
      schema: installmentsOrderDataSchema,
      ...requestSignal(options),
    });
  }

  /**
   * Reads the current state of one order.
   *
   * This is the polling counterpart to `result_callback`, which Monobank sends
   * only for terminal outcomes: intermediate states such as
   * `IN_PROCESS/WAITING_FOR_CLIENT` are only visible here. Never retried
   * automatically; a caller polling this should space its own calls. A provided
   * `RequestOptions.signal` cancels the active attempt.
   * @example
   * ```ts
   * const state = await client.orders.getState({ order_id: orderId });
   * ```
   * @param input Order identifier.
   * @param options Optional cancellation controls for this request.
   * @returns Validated state of the order.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status, including 401 for a bad signature and 404 for an unknown order.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the order-state schema.
   * @throws {MonobankValidationError} When `order_id` is not a UUID.
   */
  public async getState(
    input: InstallmentsOrderIdentifierInput,
    options?: RequestOptions,
  ): Promise<InstallmentsOrderState> {
    return await this.transport.postJson({
      auth: true,
      body: parseInstallmentsOrderIdentifier(
        input,
        getInstallmentsOrderStateEndpoint,
      ),
      endpoint: getInstallmentsOrderStateEndpoint,
      retryable: false,
      schema: installmentsOrderStateSchema,
      ...requestSignal(options),
    });
  }

  /**
   * Rejects an order instead of releasing the goods.
   *
   * The counterpart to `confirm()` once an order reaches
   * `WAITING_FOR_STORE_CONFIRM` and the store cannot fulfil it. Never retried
   * automatically. A provided `RequestOptions.signal` cancels the active attempt.
   * @example
   * ```ts
   * await client.orders.reject({ order_id: orderId });
   * ```
   * @param input Order identifier.
   * @param options Optional cancellation controls for this request.
   * @returns Validated order state after rejection.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status, including 401 for a bad signature and 404 for an unknown order.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the order-state schema.
   * @throws {MonobankValidationError} When `order_id` is not a UUID.
   */
  public async reject(
    input: InstallmentsOrderIdentifierInput,
    options?: RequestOptions,
  ): Promise<InstallmentsOrderState> {
    return await this.transport.postJson({
      auth: true,
      body: parseInstallmentsOrderIdentifier(
        input,
        rejectInstallmentsOrderEndpoint,
      ),
      endpoint: rejectInstallmentsOrderEndpoint,
      retryable: false,
      schema: installmentsOrderStateSchema,
      ...requestSignal(options),
    });
  }

  /**
   * Returns goods from an order, refunding to the card or as cash.
   *
   * `sum` is hryvnia rather than minor units. Check
   * `checkPaid().bank_can_return_money_to_card` before sending
   * `return_money_to_card: true`, since Monobank reports there whether a card
   * refund is possible at all. This moves money and is never retried: a retry can
   * refund twice, and `store_return_id` is the store's own idempotency handle
   * rather than something the SDK can reuse safely. A provided
   * `RequestOptions.signal` cancels the active attempt.
   * @example
   * ```ts
   * await client.orders.returnGoods({
   *   order_id: orderId,
   *   return_money_to_card: true,
   *   store_return_id: "RET-1",
   *   sum: 1_250.5,
   * });
   * ```
   * @param input Order, amount, store return identifier, and refund destination.
   * @param options Optional cancellation controls for this request.
   * @returns Validated acknowledgement of the return.
   * @throws {MonobankApiError} When Monobank returns a non-success HTTP status, including 401 for a bad signature and 404 for an unknown order.
   * @throws {MonobankNetworkError} When Fetch fails, times out, or the caller aborts.
   * @throws {MonobankResponseValidationError} When the successful payload does not match the return schema.
   * @throws {MonobankValidationError} When the order identifier is not a UUID, the amount is below 1, or a documented field is missing.
   */
  public async returnGoods(
    input: ReturnInstallmentsOrderInput,
    options?: RequestOptions,
  ): Promise<InstallmentsOrderReturn> {
    return await this.transport.postJson({
      auth: true,
      body: createReturnInstallmentsOrderBody(input),
      endpoint: returnInstallmentsOrderEndpoint,
      retryable: false,
      schema: installmentsOrderReturnSchema,
      ...requestSignal(options),
    });
  }
}
