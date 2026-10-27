import * as z from "zod/mini";

import { parseMonobankRequest } from "../../../shared/request-validation.js";

/** Root-relative POS refund status endpoint. */
const getAcquiringPosCancellationStatusEndpoint =
  "/api/merchant/pos-transaction-cancel/status";

/** Input identifying a POS refund. */
export interface GetAcquiringPosCancellationStatusInput {
  /** Refund reference, which must not be assumed to equal the initiation `tranId`. */
  readonly cancelRef: string;
}
const inputSchema = z.object({ cancelRef: z.string().check(z.minLength(1)) });
/**
 * Validates and encodes a POS refund reference before Fetch.
 * @param input Refund reference to query.
 * @returns Encoded root-relative endpoint.
 * @throws {MonobankValidationError} When the reference is empty or not a string.
 */
export function createAcquiringPosCancellationStatusEndpoint(
  input: GetAcquiringPosCancellationStatusInput,
): string {
  const parsed = parseMonobankRequest(
    inputSchema,
    input,
    getAcquiringPosCancellationStatusEndpoint,
    "Invalid POS refund reference.",
  );
  return `${getAcquiringPosCancellationStatusEndpoint}?${new URLSearchParams(parsed).toString()}`;
}
