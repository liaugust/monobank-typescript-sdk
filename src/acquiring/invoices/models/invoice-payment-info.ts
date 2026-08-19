import * as z from "zod/mini";

/** Importable values accepted by an invoice `paymentType` field. */
export const InvoicePaymentType = {
  Debit: "debit",
  Hold: "hold",
  Verification: "verification",
} as const;

/** A documented Acquiring invoice payment type. */
export type InvoicePaymentType =
  (typeof InvoicePaymentType)[keyof typeof InvoicePaymentType];

/** Importable values returned by invoice `paymentSystem` fields. */
export const InvoicePaymentSystem = {
  Mastercard: "mastercard",
  Visa: "visa",
} as const;

/** A documented payment system for an Acquiring invoice. */
export type InvoicePaymentSystem =
  (typeof InvoicePaymentSystem)[keyof typeof InvoicePaymentSystem];

/** Importable values returned by invoice `paymentMethod` fields. */
export const InvoicePaymentMethod = {
  Apple: "apple",
  Direct: "direct",
  Google: "google",
  Monobank: "monobank",
  Pan: "pan",
  Wallet: "wallet",
} as const;

/** A documented payment method for an Acquiring invoice. */
export type InvoicePaymentMethod =
  (typeof InvoicePaymentMethod)[keyof typeof InvoicePaymentMethod];

/** Runtime validator for invoice payment-card and acquiring metadata. */
export const invoicePaymentInfoSchema = z.looseObject({
  agentFee: z.optional(z.int()),
  approvalCode: z.optional(z.string()),
  bank: z.optional(z.string()),
  country: z.optional(z.string()),
  fee: z.optional(z.int()),
  maskedPan: z.string(),
  paymentMethod: z.enum(InvoicePaymentMethod),
  paymentSystem: z.enum(InvoicePaymentSystem),
  rrn: z.optional(z.string()),
  terminal: z.string(),
  tranId: z.optional(z.string()),
});
