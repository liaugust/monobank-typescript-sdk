import * as z from "zod/mini";

import { parseMonobankRequest } from "../../../shared/request-validation.js";
import { invalidInstallmentsRequestMessage } from "../../shared/request-validation.js";
import { orderIdentifierPattern } from "../shared/order-identifier.js";

/** Root-relative endpoint returning goods from a Покупка Частинами order. */
export const returnInstallmentsOrderEndpoint = "/api/order/return";

const returnInstallmentsOrderSchema = z.looseObject({
  additional_params: z.optional(z.looseObject({})),
  order_id: z
    .string()
    .check(z.refine((value) => orderIdentifierPattern.test(value))),
  return_money_to_card: z.boolean(),
  store_return_id: z.string().check(z.minLength(1)),
  sum: z.number().check(z.minimum(1)),
});

type ReturnInstallmentsOrderBody = z.output<
  typeof returnInstallmentsOrderSchema
>;

/** Input for returning goods from a Покупка Частинами order. */
export interface ReturnInstallmentsOrderInput {
  /**
   * Optional extras such as `nds`.
   *
   * Monobank documents this object's fields only through a request sample, so
   * unknown keys are forwarded rather than dropped.
   */
  readonly additional_params?: Readonly<Record<string, unknown>>;
  /** Order the goods are being returned from. */
  readonly order_id: string;
  /**
   * Whether the money goes back to the client's card rather than as cash.
   *
   * `orders.checkPaid()` reports whether the bank can refund to the card at all,
   * so read that before sending `true`.
   */
  readonly return_money_to_card: boolean;
  /** Identifier of this return in the store's system. */
  readonly store_return_id: string;
  /** Returned amount in hryvnia, not minor units, with a documented minimum of 1. */
  readonly sum: number;
}

/**
 * Runtime validator for `POST /api/order/return` responses.
 *
 * Monobank documents a bare `status`, so that is the one required field.
 */
export const installmentsOrderReturnSchema = z.looseObject({
  status: z.string(),
});

/** Validated acknowledgement of a goods return. */
export type InstallmentsOrderReturn = z.infer<
  typeof installmentsOrderReturnSchema
>;

/**
 * Validates and builds a goods-return JSON body.
 * @param input Order, amount, store return identifier, and refund destination.
 * @returns Validated JSON-serializable request body.
 * @throws {MonobankValidationError} When the order identifier is not a UUID, the amount is below 1, or a documented field is missing.
 */
export function createReturnInstallmentsOrderBody(
  input: ReturnInstallmentsOrderInput,
): ReturnInstallmentsOrderBody {
  return parseMonobankRequest(
    returnInstallmentsOrderSchema,
    input,
    returnInstallmentsOrderEndpoint,
    invalidInstallmentsRequestMessage,
  );
}
