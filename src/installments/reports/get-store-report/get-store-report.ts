import * as z from "zod/mini";

import { parseMonobankRequest } from "../../../shared/request-validation.js";
import { invalidInstallmentsRequestMessage } from "../../shared/request-validation.js";

/** Root-relative endpoint returning a store's settlement report for one day. */
export const getInstallmentsStoreReportEndpoint = "/api/store/report";

const getInstallmentsStoreReportSchema = z.object({
  date: z
    .string()
    .check(z.refine((value) => /^\d{4}-\d{2}-\d{2}$/u.test(value))),
});

/** Input selecting the day a store report covers. */
export interface GetInstallmentsStoreReportInput {
  /**
   * Report day as `YYYY-MM-DD`.
   *
   * Rejected before Fetch in any other form, because Monobank documents the date
   * without a time component and a timestamp would silently select nothing.
   */
  readonly date: string;
}

/**
 * Runtime validator for one order line of a store report.
 *
 * Every field is optional because Monobank documents this response with a sample
 * rather than a schema. `total_sum`, `transferred_sum`, and `commission` are
 * hryvnia rather than minor units, and `operation_timestamp` is explicitly `null`
 * until the transfer is made.
 */
export const installmentsStoreReportOrderSchema = z.looseObject({
  commission: z.optional(z.number()),
  commission_percent: z.optional(z.number()),
  invoice_number: z.optional(z.string()),
  odb_contract_number: z.optional(z.string()),
  operation_timestamp: z.optional(z.nullable(z.string())),
  order_date: z.optional(z.string()),
  order_id: z.optional(z.string()),
  pay_parts: z.optional(z.int()),
  total_sum: z.optional(z.number()),
  transferred_sum: z.optional(z.number()),
});

/** One validated settled order from a store report. */
export type InstallmentsStoreReportOrder = z.infer<
  typeof installmentsStoreReportOrderSchema
>;

/** Runtime validator for `POST /api/store/report` responses. */
export const installmentsStoreReportSchema = z.looseObject({
  orders: z.array(installmentsStoreReportOrderSchema),
});

/** Validated store settlement report for one day. */
export interface InstallmentsStoreReport {
  /** Orders settled on the requested day. */
  readonly orders: readonly InstallmentsStoreReportOrder[];
  /** Additive response fields preserved by the loose runtime schema. */
  readonly [key: string]: unknown;
}

/**
 * Validates and builds a store-report request body.
 * @param input Report day as `YYYY-MM-DD`.
 * @returns Validated JSON-serializable request body.
 * @throws {MonobankValidationError} When the date is not `YYYY-MM-DD`.
 */
export function createGetInstallmentsStoreReportBody(
  input: GetInstallmentsStoreReportInput,
): GetInstallmentsStoreReportInput {
  return parseMonobankRequest(
    getInstallmentsStoreReportSchema,
    input,
    getInstallmentsStoreReportEndpoint,
    invalidInstallmentsRequestMessage,
  );
}
