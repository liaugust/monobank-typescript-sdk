import * as z from "zod/mini";

/** Importable values returned by tokenized-card `status` fields. */
export const InvoiceWalletStatus = {
  Created: "created",
  Failed: "failed",
  New: "new",
} as const;

/** A documented tokenized-card status for an Acquiring invoice. */
export type InvoiceWalletStatus =
  (typeof InvoiceWalletStatus)[keyof typeof InvoiceWalletStatus];

/** Runtime validator for tokenized-card data returned with an invoice. */
export const invoiceWalletSchema = z.looseObject({
  cardToken: z.string(),
  status: z.enum(InvoiceWalletStatus),
  walletId: z.string(),
});
