import * as z from "zod/mini";

import type { GetInvoiceFiscalChecksInput } from "../invoice-identifier.js";
import { createInvoiceQueryEndpoint } from "../invoice-identifier.js";

/** Root-relative endpoint used to load invoice fiscal checks. */
const getInvoiceFiscalChecksEndpoint = "/api/merchant/invoice/fiscal-checks";

/** Importable values returned by fiscal check `type` fields. */
export const FiscalCheckType = {
  Return: "return",
  Sale: "sale",
} as const;

/** A documented fiscal check type. */
export type FiscalCheckType =
  (typeof FiscalCheckType)[keyof typeof FiscalCheckType];

/** Importable values returned by fiscal check `status` fields. */
export const FiscalCheckStatus = {
  Done: "done",
  Failed: "failed",
  New: "new",
  Process: "process",
} as const;

/** A documented fiscal check status. */
export type FiscalCheckStatus =
  (typeof FiscalCheckStatus)[keyof typeof FiscalCheckStatus];

/** Importable values returned by fiscal check `fiscalizationSource` fields. */
export const FiscalizationSource = {
  Checkbox: "checkbox",
  Monopay: "monopay",
} as const;

/** A documented service used to fiscalize an Acquiring payment. */
export type FiscalizationSource =
  (typeof FiscalizationSource)[keyof typeof FiscalizationSource];

const fiscalCheckSchema = z.looseObject({
  file: z.optional(z.string()),
  fiscalizationSource: z.enum(FiscalizationSource),
  id: z.string(),
  status: z.enum(FiscalCheckStatus),
  statusDescription: z.optional(z.string()),
  taxUrl: z.optional(z.string()),
  type: z.enum(FiscalCheckType),
});

/** Runtime validator for `GET /api/merchant/invoice/fiscal-checks` responses. */
export const invoiceFiscalChecksSchema = z.looseObject({
  checks: z.optional(z.array(fiscalCheckSchema)),
});

/** Fiscal checks created for an invoice, when fiscalization is enabled. */
export type InvoiceFiscalChecks = z.infer<typeof invoiceFiscalChecksSchema>;

/**
 * Builds the encoded fiscal-checks endpoint.
 * @param input Invoice identifier.
 * @returns Root-relative endpoint with an encoded query string.
 * @throws {MonobankValidationError} When `invoiceId` is empty.
 */
export function createInvoiceFiscalChecksEndpoint(
  input: GetInvoiceFiscalChecksInput,
): string {
  return createInvoiceQueryEndpoint(getInvoiceFiscalChecksEndpoint, input);
}

export type { GetInvoiceFiscalChecksInput } from "../invoice-identifier.js";
