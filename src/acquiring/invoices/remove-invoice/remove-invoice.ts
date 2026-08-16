import type { RemoveInvoiceInput } from "../shared/invoice-identifier.js";
import { invoiceIdentifierSchema } from "../shared/invoice-identifier.js";
import { parseInvoiceRequest } from "../shared/request-validation.js";

/** Root-relative endpoint used to invalidate an unpaid invoice. */
export const removeInvoiceEndpoint = "/api/merchant/invoice/remove";

interface RemoveInvoiceBody {
  readonly invoiceId: string;
}

/**
 * Validates and builds an invoice-removal JSON body.
 * @param input Invoice identifier.
 * @returns Validated JSON-serializable request body.
 * @throws {MonobankValidationError} When `invoiceId` is empty.
 */
export function createRemoveInvoiceBody(
  input: RemoveInvoiceInput,
): RemoveInvoiceBody {
  return parseInvoiceRequest(
    invoiceIdentifierSchema,
    input,
    removeInvoiceEndpoint,
  );
}

export type { RemoveInvoiceInput } from "../shared/invoice-identifier.js";
