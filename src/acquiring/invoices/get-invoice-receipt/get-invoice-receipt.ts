import * as z from "zod/mini";

import type { GetInvoiceStatusInput } from "../shared/invoice-identifier.js";
import { parseInvoiceRequest } from "../shared/request-validation.js";

/** Root-relative endpoint used to load or email an invoice receipt. */
const getInvoiceReceiptEndpoint = "/api/merchant/invoice/receipt";

const receiptQuerySchema = z.object({
  email: z.optional(z.string()),
  invoiceId: z.string().check(z.minLength(1)),
});

/** Input for retrieving or emailing an invoice receipt. */
export interface GetInvoiceReceiptInput extends GetInvoiceStatusInput {
  /** Optional email address to which Monobank should send the receipt. */
  readonly email?: string;
}

/** Runtime validator for `GET /api/merchant/invoice/receipt` responses. */
export const receiptSchema = z.looseObject({
  file: z.optional(z.string()),
});

/** Base64-encoded invoice receipt when Monobank returns one. */
export type InvoiceReceipt = z.infer<typeof receiptSchema>;

/**
 * Builds the encoded receipt endpoint.
 * @param input Invoice identifier and optional delivery email.
 * @returns Root-relative endpoint with encoded query parameters.
 * @throws {MonobankValidationError} When `invoiceId` is empty.
 */
export function createInvoiceReceiptEndpoint(
  input: GetInvoiceReceiptInput,
): string {
  const parsed = parseInvoiceRequest(
    receiptQuerySchema,
    input,
    getInvoiceReceiptEndpoint,
  );
  const parameters = new URLSearchParams({ invoiceId: parsed.invoiceId });

  if (parsed.email !== undefined) {
    parameters.set("email", parsed.email);
  }

  return `${getInvoiceReceiptEndpoint}?${parameters.toString()}`;
}
