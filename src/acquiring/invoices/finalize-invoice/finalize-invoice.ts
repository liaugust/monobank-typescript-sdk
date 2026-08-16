import * as z from "zod/mini";

import type { FiscalizationItem } from "../models/fiscalization-item.js";
import { fiscalizationItemSchema } from "../models/fiscalization-item.js";
import type { GetInvoiceStatusInput } from "../shared/invoice-identifier.js";
import { parseInvoiceRequest } from "../shared/request-validation.js";

/** Root-relative endpoint used to finalize a held invoice. */
export const finalizeInvoiceEndpoint = "/api/merchant/invoice/finalize";

const finalizeInvoiceSchema = z.object({
  amount: z.optional(z.int()),
  invoiceId: z.string().check(z.minLength(1)),
  items: z.optional(z.array(fiscalizationItemSchema)),
});

type FinalizeInvoiceBody = z.output<typeof finalizeInvoiceSchema>;

/** Input for finalizing all or part of a held invoice amount. */
export interface FinalizeInvoiceInput extends GetInvoiceStatusInput {
  /** Optional amount to capture in minor units. */
  readonly amount?: number;
  /** Optional items used when fiscalizing a changed capture amount. */
  readonly items?: readonly FiscalizationItem[];
}

/** Runtime validator for `POST /api/merchant/invoice/finalize` responses. */
export const finalizeInvoiceResponseSchema = z.looseObject({
  status: z.literal("success"),
});

/** Confirmation that an invoice hold finalization was accepted. */
export type InvoiceFinalization = z.infer<typeof finalizeInvoiceResponseSchema>;

/**
 * Validates and builds a hold-finalization JSON body.
 * @param input Hold finalization parameters.
 * @returns Validated JSON-serializable request body.
 * @throws {MonobankValidationError} When a documented field has an invalid shape.
 */
export function createFinalizeInvoiceBody(
  input: FinalizeInvoiceInput,
): FinalizeInvoiceBody {
  return parseInvoiceRequest(
    finalizeInvoiceSchema,
    input,
    finalizeInvoiceEndpoint,
  );
}
