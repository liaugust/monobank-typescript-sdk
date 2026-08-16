import * as z from "zod/mini";

import { parseInvoiceRequest } from "./request-validation.js";

/** Runtime validator for a non-empty invoice identifier. */
export const invoiceIdentifierSchema = z.object({
  invoiceId: z.string().check(z.minLength(1)),
});

/** Input identifying an invoice status request. */
export interface GetInvoiceStatusInput {
  /** Monobank invoice identifier. */
  readonly invoiceId: string;
}

/** Input identifying an unpaid invoice to invalidate. */
export type RemoveInvoiceInput = GetInvoiceStatusInput;

/** Input identifying an invoice whose fiscal checks should be loaded. */
export type GetInvoiceFiscalChecksInput = GetInvoiceStatusInput;

/**
 * Builds an encoded invoice query endpoint.
 * @param endpoint Root-relative invoice endpoint.
 * @param input Invoice identifier.
 * @returns Endpoint with an encoded `invoiceId` query parameter.
 * @throws {MonobankValidationError} When `invoiceId` is empty.
 */
export function createInvoiceQueryEndpoint(
  endpoint: string,
  input: GetInvoiceStatusInput,
): string {
  const parsed = parseInvoiceRequest(invoiceIdentifierSchema, input, endpoint);
  const parameters = new URLSearchParams({ invoiceId: parsed.invoiceId });

  return `${endpoint}?${parameters.toString()}`;
}
