import * as z from "zod/mini";

import { parseMonobankRequest } from "../../../shared/request-validation.js";

/** Root-relative endpoint refunding a POS transaction. */
export const cancelAcquiringPosTransactionEndpoint =
  "/api/merchant/pos-transaction-cancel";

const cancelAcquiringPosTransactionSchema = z.object({
  amount: z.int().check(z.minimum(1)),
  rrn: z
    .string()
    .check(z.refine((value) => value.length > 0 && value.trim() === value)),
});

type CancelAcquiringPosTransactionBody = z.output<
  typeof cancelAcquiringPosTransactionSchema
>;

/** Input for refunding part or all of a POS transaction. */
export interface CancelAcquiringPosTransactionInput {
  /**
   * Refund amount in the currency's minor units.
   *
   * Monobank rejects more than the original transaction has left after earlier
   * refunds, which only it can evaluate, so only the shape is checked here.
   */
  readonly amount: number;
  /** Reference Retrieval Number of the original POS transaction. */
  readonly rrn: string;
}

/** Runtime validator for `POST /api/merchant/pos-transaction-cancel` responses. */
export const acquiringPosCancellationSchema = z.looseObject({
  status: z.string(),
  tranId: z.optional(z.string()),
});

/** Validated acknowledgement of an initiated POS refund. */
export type AcquiringPosCancellation = z.infer<
  typeof acquiringPosCancellationSchema
>;

/**
 * Validates and builds the POS refund JSON body.
 * @param input Original transaction reference and refund amount.
 * @returns Validated JSON-serializable request body.
 * @throws {MonobankValidationError} When `rrn` is blank or `amount` is not a positive integer.
 */
export function createCancelAcquiringPosTransactionBody(
  input: CancelAcquiringPosTransactionInput,
): CancelAcquiringPosTransactionBody {
  return parseMonobankRequest(
    cancelAcquiringPosTransactionSchema,
    input,
    cancelAcquiringPosTransactionEndpoint,
    "Invalid Acquiring POS refund request.",
  );
}
