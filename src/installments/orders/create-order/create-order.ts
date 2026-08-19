import * as z from "zod/mini";

import { parseMonobankRequest } from "../../../shared/request-validation.js";
import { invalidInstallmentsRequestMessage } from "../../shared/request-validation.js";

/** Root-relative endpoint creating a Покупка Частинами order. */
export const createInstallmentsOrderEndpoint = "/api/order/create";

const createInstallmentsOrderSchema = z.looseObject({
  additional_params: z.optional(z.looseObject({})),
  available_programs: z.array(
    z.looseObject({
      available_parts_count: z.optional(z.array(z.int())),
      type: z.optional(z.string()),
    }),
  ),
  client_phone: z
    .string()
    .check(z.refine((value) => /^\+[0-9]{9,15}$/u.test(value))),
  financial_company_merchant_info: z.optional(z.looseObject({})),
  invoice: z.looseObject({}),
  products: z.array(z.looseObject({})),
  result_callback: z.optional(z.string()),
  store_order_id: z.string().check(z.minLength(1), z.maxLength(64)),
  total_sum: z.number().check(z.minimum(2)),
});

type CreateInstallmentsOrderBody = z.output<
  typeof createInstallmentsOrderSchema
>;

/** Invoice details attached to a new Покупка Частинами order. */
export interface InstallmentsOrderInvoiceInput {
  /** Invoice date, documented as `YYYY-MM-DD`. */
  readonly date?: string;
  /** Invoice number in the store's system. */
  readonly number?: string;
  /** Point-of-sale identifier the order originates from. */
  readonly point_id?: string;
  /** Sales channel, such as `INTERNET`. */
  readonly source?: string;
  /** Further invoice fields Monobank documents only by example. */
  readonly [key: string]: unknown;
}

/** One installment program offered for an order. */
export interface InstallmentsProgramInput {
  /** Part counts the client may choose between, such as `[3, 6, 10]`. */
  readonly available_parts_count?: readonly number[];
  /** Program type, such as `payment_installments`. */
  readonly type?: string;
  /** Further program fields Monobank documents only by example. */
  readonly [key: string]: unknown;
}

/** One line item on a Покупка Частинами order. */
export interface InstallmentsProductInput {
  /** Number of units. */
  readonly count?: number;
  /** Item name shown to the client. */
  readonly name?: string;
  /** Line total in hryvnia. */
  readonly sum?: number;
  /** Further item fields Monobank documents only by example. */
  readonly [key: string]: unknown;
}

/** Input for creating a Покупка Частинами order. */
export interface CreateInstallmentsOrderInput {
  /**
   * Optional extras such as `seller_phone`, `nds`, and `ext_initial_sum`.
   *
   * Monobank documents this object's fields only through a request sample, so
   * unknown keys are forwarded rather than dropped.
   */
  readonly additional_params?: Readonly<Record<string, unknown>>;
  /** Installment programs the client may choose from; at least one is required. */
  readonly available_programs: readonly InstallmentsProgramInput[];
  /** Client phone number in international format, such as `+380501234567`. */
  readonly client_phone: string;
  /**
   * Optional seller details for the financing company.
   *
   * Documented by sample as `store_name`, `edrpou_code`, and `iban_account`;
   * unknown keys are forwarded.
   */
  readonly financial_company_merchant_info?: Readonly<Record<string, unknown>>;
  /** Invoice this order is raised against. */
  readonly invoice: InstallmentsOrderInvoiceInput;
  /** Line items being bought. */
  readonly products: readonly InstallmentsProductInput[];
  /**
   * Optional URL Monobank posts the order result to.
   *
   * Callbacks arrive only for terminal outcomes; poll `getState()` for the rest,
   * and authenticate every callback with
   * `verifyInstallmentsCallbackSignature()`.
   */
  readonly result_callback?: string;
  /** Order identifier in the store's system, 1 to 64 characters. */
  readonly store_order_id: string;
  /**
   * Order total in hryvnia, not minor units, with a documented minimum of 2.
   *
   * A value such as `2499.99` is sent as written; multiplying by 100 the way the
   * Acquiring family requires would ask the client for 100 times the price.
   */
  readonly total_sum: number;
}

/** Runtime validator for `POST /api/order/create` responses. */
export const newInstallmentsOrderSchema = z.looseObject({
  order_id: z.string(),
});

/** Identifier Monobank assigned to a newly created order. */
export type NewInstallmentsOrder = z.infer<typeof newInstallmentsOrderSchema>;

/**
 * Validates and builds a create-order JSON body.
 *
 * The schema is loose rather than strict: Monobank publishes the nested objects
 * only through a request sample, so an undocumented key is forwarded instead of
 * being silently dropped the way a strict schema would drop it.
 * @param input Order, client, invoice, program, and product details.
 * @returns Validated JSON-serializable request body.
 * @throws {MonobankValidationError} When a documented field is missing or malformed.
 */
export function createInstallmentsOrderBody(
  input: CreateInstallmentsOrderInput,
): CreateInstallmentsOrderBody {
  return parseMonobankRequest(
    createInstallmentsOrderSchema,
    input,
    createInstallmentsOrderEndpoint,
    invalidInstallmentsRequestMessage,
  );
}
