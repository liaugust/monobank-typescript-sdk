import * as z from "zod/mini";

import type { FiscalizationItem } from "../models/fiscalization-item.js";
import { fiscalizationItemSchema } from "../models/fiscalization-item.js";
import type { GetInvoiceStatusInput } from "../shared/invoice-identifier.js";
import { parseInvoiceRequest } from "../shared/request-validation.js";

/** Root-relative endpoint used to cancel an invoice payment. */
export const cancelInvoiceEndpoint = "/api/merchant/invoice/cancel";

const cancelInvoiceSchema = z.object({
  amount: z.optional(z.int()),
  extRef: z.optional(z.string()),
  invoiceId: z.string().check(z.minLength(1)),
  items: z.optional(z.array(fiscalizationItemSchema)),
});

type CancelInvoiceBody = z.output<typeof cancelInvoiceSchema>;

/** Input for cancelling all or part of a successful invoice payment. */
export interface CancelInvoiceInput extends GetInvoiceStatusInput {
  /** Optional partial cancellation amount in minor units. */
  readonly amount?: number;
  /** Optional merchant-defined cancellation reference. */
  readonly extRef?: string;
  /** Optional items used to fiscalize the return. */
  readonly items?: readonly FiscalizationItem[];
}

/**
 * Validates and builds a cancellation JSON body.
 * @param input Cancellation parameters.
 * @returns Validated JSON-serializable request body.
 * @throws {MonobankValidationError} When a documented field has an invalid shape.
 */
export function createCancelInvoiceBody(
  input: CancelInvoiceInput,
): CancelInvoiceBody {
  return parseInvoiceRequest(cancelInvoiceSchema, input, cancelInvoiceEndpoint);
}
